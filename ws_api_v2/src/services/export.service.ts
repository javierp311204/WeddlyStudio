import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';

export class ExportService {

  private async assertWeddingAccess(weddingId: string, userId: string) {
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: {
        user_roles: { where: { user_id: userId }, take: 1 },
      },
    });
    if (!wedding) throw new AppError('Boda no encontrada', 404);
    const hasAccess = wedding.created_by === userId || wedding.user_roles.length > 0;
    if (!hasAccess) throw new AppError('No tienes acceso a esta boda', 403);
    return wedding;
  }

  // ─────────────────────────────────────────────
  // ICS — Exportar tareas con due_date a Google Calendar
  // ─────────────────────────────────────────────

  async exportICS(weddingId: string, userId: string): Promise<string> {
    const wedding = await this.assertWeddingAccess(weddingId, userId);

    const tasks = await prisma.task.findMany({
      where: {
        wedding_id: weddingId,
        due_date: { not: null },
      },
      orderBy: { due_date: 'asc' },
    });

    const events = await prisma.event.findMany({
      where: { wedding_id: weddingId },
      orderBy: { start_date: 'asc' },
    });

    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
    };

    const wrapLine = (line: string): string => {
      const chunks: string[] = [];
      while (line.length > 75) {
        chunks.push(line.substring(0, 75));
        line = ' ' + line.substring(75);
      }
      chunks.push(line);
      return chunks.join('\r\n');
    };

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//Weddly//Wedding Planner//ES`,
      `X-WR-CALNAME:${escapeText(wedding.name)} - Weddly`,
      'X-WR-TIMEZONE:Europe/Madrid',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    // Tareas con due_date
    for (const task of tasks) {
      if (!task.due_date) continue;

      const uid = `task-${task.id}@weddly.app`;
      const dtstart = formatDate(task.due_date);
      const dtend = formatDate(new Date(task.due_date.getTime() + 60 * 60 * 1000)); // +1h
      const created = formatDate(task.created_at);
      const updated = formatDate(task.updated_at);

      const statusMap: Record<string, string> = {
        pending: 'NEEDS-ACTION',
        in_progress: 'IN-PROCESS',
        completed: 'COMPLETED',
        cancelled: 'CANCELLED',
      };

      const categoryLabel = task.category ? `[${task.category.toUpperCase()}] ` : '';
      const summary = escapeText(`${categoryLabel}${task.title}`);
      const description = task.description
        ? escapeText(task.description)
        : escapeText(`Tarea de boda: ${task.title}`);

      lines.push(
        'BEGIN:VEVENT',
        wrapLine(`UID:${uid}`),
        wrapLine(`DTSTART:${dtstart}`),
        wrapLine(`DTEND:${dtend}`),
        wrapLine(`DTSTAMP:${created}`),
        wrapLine(`LAST-MODIFIED:${updated}`),
        wrapLine(`SUMMARY:${summary}`),
        wrapLine(`DESCRIPTION:${description}`),
        `STATUS:${statusMap[task.status] ?? 'NEEDS-ACTION'}`,
        task.phase ? wrapLine(`CATEGORIES:${task.phase.replace('_', ' ').toUpperCase()}`) : '',
        'END:VEVENT',
      );
    }

    // Eventos/Hitos del modelo Event
    for (const event of events) {
      const uid = `event-${event.id}@weddly.app`;
      const dtstart = formatDate(event.start_date);
      const dtend = event.end_date
        ? formatDate(event.end_date)
        : formatDate(new Date(event.start_date.getTime() + 2 * 60 * 60 * 1000));
      const created = formatDate(event.created_at);

      lines.push(
        'BEGIN:VEVENT',
        wrapLine(`UID:${uid}`),
        wrapLine(`DTSTART:${dtstart}`),
        wrapLine(`DTEND:${dtend}`),
        wrapLine(`DTSTAMP:${created}`),
        wrapLine(`SUMMARY:${escapeText('🎉 ' + event.title)}`),
        event.description
          ? wrapLine(`DESCRIPTION:${escapeText(event.description)}`)
          : '',
        'END:VEVENT',
      );
    }

    // Fecha de boda como evento especial
    if (wedding.wedding_date) {
      const weddingDate = formatDate(wedding.wedding_date);
      const weddingEnd = formatDate(
        new Date(wedding.wedding_date.getTime() + 8 * 60 * 60 * 1000),
      );
      lines.push(
        'BEGIN:VEVENT',
        `UID:wedding-day-${weddingId}@weddly.app`,
        `DTSTART:${weddingDate}`,
        `DTEND:${weddingEnd}`,
        `DTSTAMP:${formatDate(new Date())}`,
        wrapLine(`SUMMARY:💍 ${escapeText(wedding.name)}`),
        wedding.location_name
          ? wrapLine(`LOCATION:${escapeText(wedding.location_name)}`)
          : '',
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');

    return lines.filter(l => l !== '').join('\r\n');
  }

  // ─────────────────────────────────────────────
  // PDF — Exportar checklist completo (plan one_time / subscription)
  // ─────────────────────────────────────────────

  async exportPDFData(weddingId: string, userId: string) {
    const wedding = await this.assertWeddingAccess(weddingId, userId);

    // Verificar plan
    const allowedPlans = ['one_time', 'subscription'];
    if (!allowedPlans.includes(wedding.plan_type)) {
      throw new AppError(
        'La exportación PDF requiere un plan de pago. Actualiza tu plan para acceder a esta función.',
        403,
      );
    }

    const tasks = await prisma.task.findMany({
      where: { wedding_id: weddingId },
      include: {
        assigned_user: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
      orderBy: [{ phase: 'asc' }, { created_at: 'asc' }],
    });

    const events = await prisma.event.findMany({
      where: { wedding_id: weddingId },
      orderBy: { start_date: 'asc' },
    });

    // Agrupar tareas por fase
    const grouped = tasks.reduce<Record<string, typeof tasks>>((acc, task) => {
      const key = task.phase ?? 'sin_fase';
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});

    const totals = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
    };

    return {
      wedding: {
        id: wedding.id,
        name: wedding.name,
        wedding_date: wedding.wedding_date,
        location_name: wedding.location_name,
        plan_type: wedding.plan_type,
      },
      tasks,
      grouped,
      events,
      totals,
      generated_at: new Date().toISOString(),
    };
  }
}

export default new ExportService();