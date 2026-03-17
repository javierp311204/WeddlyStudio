import OpenAI from 'openai';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';

// ─── Límites por plan ────────────────────────────────────────────
const AI_LIMITS: Record<string, Record<string, number>> = {
  free:         { chat: 10, checklist: 3, seating: 3, guest: 3 },
  one_time:     { chat: 50, checklist: 15, seating: 15, guest: 15 },
  subscription: { chat: -1, checklist: -1, seating: -1, guest: -1 },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class AiService {

  // ─── Helper: mes actual ───────────────────────────────────────
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // ─── Helper: verificar y consumir límite ──────────────────────
  private async checkAndConsumeLimit(
    userId: string,
    weddingId: string,
    module: string,
    planType: string,
  ): Promise<void> {
    const limits = AI_LIMITS[planType] ?? AI_LIMITS['free'];
    const limit  = limits[module] ?? 0;

    if (limit === -1) return;

    const month = this.getCurrentMonth();

    const usage = await prisma.aiUsage.upsert({
      where:  { user_id_wedding_id_module_month: { user_id: userId, wedding_id: weddingId, module, month } },
      create: { user_id: userId, wedding_id: weddingId, module, month, count: 0 },
      update: {},
    });

    if (usage.count >= limit) {
      throw new AppError(
        `Has alcanzado el límite de ${limit} usos de IA para el módulo "${module}" este mes. Actualiza tu plan para continuar.`,
        429,
        'AI_LIMIT_REACHED',
      );
    }

    await prisma.aiUsage.update({
      where: { user_id_wedding_id_module_month: { user_id: userId, wedding_id: weddingId, module, month } },
      data:  { count: { increment: 1 } },
    });
  }

  // ─── Helper: obtener contexto de la boda ─────────────────────
  private async getWeddingContext(weddingId: string): Promise<string> {
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId, deleted_at: null },
      include: {
        guests: {
          where: { deleted_at: null },
          select: { first_name: true, last_name: true, group: true, rsvp_status: true, table_id: true, allergies: true },
        },
        tables: {
          select: { name: true, shape: true, max_capacity: true, guests: { select: { id: true } } },
        },
        tasks: {
          where: { status: { not: 'cancelled' } },
          select: { title: true, phase: true, status: true, due_date: true },
          orderBy: { due_date: 'asc' },
          take: 30,
        },
      },
    });

    if (!wedding) throw new AppError('Boda no encontrada', 404);

    const daysUntilWedding = wedding.wedding_date
      ? Math.ceil((new Date(wedding.wedding_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    const confirmedGuests    = wedding.guests.filter(g => g.rsvp_status === 'confirmed').length;
    const pendingGuests      = wedding.guests.filter(g => g.rsvp_status === 'pending').length;
    const guestsWithoutTable = wedding.guests.filter(g => !g.table_id).length;
    const pendingTasks       = wedding.tasks.filter(t => t.status === 'pending').length;
    const completedTasks     = wedding.tasks.filter(t => t.status === 'completed').length;

    return `
Boda: "${wedding.name}"
Fecha: ${wedding.wedding_date ? new Date(wedding.wedding_date).toLocaleDateString('es-ES') : 'Por definir'}
${daysUntilWedding !== null ? `Días hasta la boda: ${daysUntilWedding}` : ''}
Lugar: ${wedding.location_name ?? 'Por definir'}
Dress code: ${wedding.dress_code ?? 'No especificado'}
Plan actual: ${wedding.plan_type}

INVITADOS (${wedding.guests.length} total):
- Confirmados: ${confirmedGuests}
- Pendientes: ${pendingGuests}
- Sin mesa asignada: ${guestsWithoutTable}
- Grupos: ${[...new Set(wedding.guests.map(g => g.group).filter(Boolean))].join(', ') || 'Sin grupos definidos'}

MESAS (${wedding.tables.length} total):
${wedding.tables.map(t => `- ${t.name}: ${t.guests.length}/${t.max_capacity} ocupada (${t.shape})`).join('\n') || '- Sin mesas creadas'}

CHECKLIST (${wedding.tasks.length} tareas):
- Completadas: ${completedTasks}
- Pendientes: ${pendingTasks}
- Próximas tareas: ${wedding.tasks.filter(t => t.status === 'pending').slice(0, 5).map(t => `"${t.title}" (${t.phase})`).join(', ') || 'Ninguna'}
    `.trim();
  }

  // ─── 1. CHAT GENERAL ─────────────────────────────────────────
  async chat(
    userId: string,
    weddingId: string,
    planType: string,
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[] = [],
  ) {
    await this.checkAndConsumeLimit(userId, weddingId, 'chat', planType);

    const context = await this.getWeddingContext(weddingId);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un asistente experto en organización de bodas integrado en Weddly Studio.
Eres amable, práctico y empático. Respondes siempre en el idioma del usuario.
Tienes acceso al contexto actual de la boda del usuario:

${context}

Usa este contexto para dar respuestas personalizadas y relevantes.
Sé conciso pero completo. Usa listas cuando ayuden a la claridad.`,
        },
        ...history.slice(-10),
        { role: 'user', content: message },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    return {
      message: response.choices[0].message.content,
      usage:   await this.getUsageInfo(userId, weddingId, 'chat', planType),
    };
  }

  // ─── 2. SUGERIR TAREAS PARA CHECKLIST ────────────────────────
  async suggestTasks(userId: string, weddingId: string, planType: string) {
    await this.checkAndConsumeLimit(userId, weddingId, 'checklist', planType);

    const context = await this.getWeddingContext(weddingId);

    const existingTasks = await prisma.task.findMany({
      where:  { wedding_id: weddingId, status: { not: 'cancelled' } },
      select: { title: true },
    });
    const existingTitles = existingTasks.map(t => t.title).join(', ');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en organización de bodas. Responde SOLO con un JSON válido, sin texto adicional, sin markdown, sin bloques de código.`,
        },
        {
          role: 'user',
          content: `Basándote en este contexto de boda:
${context}

Tareas que ya existen (NO repetir): ${existingTitles || 'Ninguna'}

Sugiere entre 5 y 8 tareas nuevas y relevantes que falten según la fecha y el estado actual.
Devuelve ÚNICAMENTE este JSON (sin ningún texto adicional):
{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "phase": "12_months|9_months|6_months|3_months|1_month|1_week|1_day",
      "category": "venue|catering|music|photography|decoration|invitations|legal|other"
    }
  ]
}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.6,
    });

    const content = response.choices[0].message.content ?? '{}';
    const parsed  = JSON.parse(content.replace(/```json|```/g, '').trim());

    return {
      tasks: parsed.tasks ?? [],
      usage: await this.getUsageInfo(userId, weddingId, 'checklist', planType),
    };
  }

  // ─── 3. SUGERIR DISTRIBUCIÓN DE MESAS ────────────────────────
  async suggestSeating(userId: string, weddingId: string, planType: string) {
    await this.checkAndConsumeLimit(userId, weddingId, 'seating', planType);

    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId, deleted_at: null },
      include: {
        guests: {
          where: { deleted_at: null, table_id: null, rsvp_status: { not: 'declined' } },
          select: { id: true, first_name: true, last_name: true, group: true, allergies: true },
        },
        tables: {
          select: {
            id: true, name: true, max_capacity: true, shape: true,
            guests: { where: { deleted_at: null }, select: { id: true } },
          },
        },
      },
    });

    if (!wedding) throw new AppError('Boda no encontrada', 404);

    const guestsSinMesa = wedding.guests;
    const mesas = wedding.tables
      .map(t => ({ id: t.id, name: t.name, capacidadLibre: t.max_capacity - t.guests.length, shape: t.shape }))
      .filter(t => t.capacidadLibre > 0);

    if (guestsSinMesa.length === 0) {
      return { assignments: [], message: 'Todos los invitados ya tienen mesa asignada.', usage: await this.getUsageInfo(userId, weddingId, 'seating', planType) };
    }
    if (mesas.length === 0) {
      return { assignments: [], message: 'No hay mesas con capacidad disponible.', usage: await this.getUsageInfo(userId, weddingId, 'seating', planType) };
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en organización de bodas. Responde SOLO con un JSON válido, sin texto adicional.`,
        },
        {
          role: 'user',
          content: `Asigna los siguientes invitados a las mesas disponibles. Agrupa por grupo/afinidad y respeta las capacidades.

INVITADOS SIN MESA:
${JSON.stringify(guestsSinMesa, null, 2)}

MESAS DISPONIBLES:
${JSON.stringify(mesas, null, 2)}

Devuelve ÚNICAMENTE este JSON:
{
  "assignments": [
    { "guest_id": "uuid", "table_id": "uuid", "reason": "string corto" }
  ],
  "summary": "string explicando la lógica general"
}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.4,
    });

    const content = response.choices[0].message.content ?? '{}';
    const parsed  = JSON.parse(content.replace(/```json|```/g, '').trim());

    return {
      assignments: parsed.assignments ?? [],
      summary:     parsed.summary ?? '',
      usage:       await this.getUsageInfo(userId, weddingId, 'seating', planType),
    };
  }

  // ─── 4. SUGERIR MESA PARA UN INVITADO ────────────────────────
  async suggestTableForGuest(
    userId: string,
    weddingId: string,
    planType: string,
    guestId: string,
  ) {
    await this.checkAndConsumeLimit(userId, weddingId, 'guest', planType);

    const guest = await prisma.guest.findUnique({
      where:  { id: guestId, deleted_at: null },
      select: { first_name: true, last_name: true, group: true, allergies: true, rsvp_status: true },
    });

    if (!guest) throw new AppError('Invitado no encontrado', 404);

    const tables = await prisma.table.findMany({
      where: { wedding_id: weddingId },
      include: {
        guests: {
          where:  { deleted_at: null },
          select: { first_name: true, last_name: true, group: true },
        },
      },
    });

    const tablasConEspacio = tables
      .filter(t => t.guests.length < t.max_capacity)
      .map(t => ({
        id:             t.id,
        name:           t.name,
        capacidadLibre: t.max_capacity - t.guests.length,
        grupos:         [...new Set(t.guests.map(g => g.group).filter(Boolean))],
      }));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en organización de bodas. Responde SOLO con un JSON válido, sin texto adicional.`,
        },
        {
          role: 'user',
          content: `Sugiere la mejor mesa para este invitado basándote en su grupo y la composición de las mesas.

INVITADO: ${JSON.stringify(guest)}

MESAS DISPONIBLES: ${JSON.stringify(tablasConEspacio)}

Devuelve ÚNICAMENTE este JSON:
{
  "table_id": "uuid de la mesa recomendada",
  "table_name": "nombre de la mesa",
  "reason": "explicación breve de por qué esta mesa"
}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.4,
    });

    const content = response.choices[0].message.content ?? '{}';
    const parsed  = JSON.parse(content.replace(/```json|```/g, '').trim());

    return {
      suggestion: parsed,
      usage:      await this.getUsageInfo(userId, weddingId, 'guest', planType),
    };
  }

  // ─── Helper: info de uso actual ──────────────────────────────
  async getUsageInfo(userId: string, weddingId: string, module: string, planType: string) {
    const limits = AI_LIMITS[planType] ?? AI_LIMITS['free'];
    const limit  = limits[module] ?? 0;

    if (limit === -1) return { used: null, limit: null, unlimited: true, remaining: null };

    const month = this.getCurrentMonth();
    const usage = await prisma.aiUsage.findUnique({
      where: { user_id_wedding_id_module_month: { user_id: userId, wedding_id: weddingId, module, month } },
    });

    return {
      used:      usage?.count ?? 0,
      limit,
      unlimited: false,
      remaining: limit - (usage?.count ?? 0),
    };
  }

  // ─── GET /ai/usage — resumen de uso del mes ──────────────────
  async getFullUsage(userId: string, weddingId: string, planType: string) {
    const month   = this.getCurrentMonth();
    const modules = ['chat', 'checklist', 'seating', 'guest'];

    const usages = await prisma.aiUsage.findMany({
      where: { user_id: userId, wedding_id: weddingId, month },
    });

    return modules.map(module => {
      const limits = AI_LIMITS[planType] ?? AI_LIMITS['free'];
      const limit  = limits[module] ?? 0;
      const usage  = usages.find(u => u.module === module);
      const used   = usage?.count ?? 0;

      return {
        module,
        used,
        limit,
        unlimited: limit === -1,
        remaining: limit === -1 ? null : Math.max(0, limit - used),
      };
    });
  }
}

export default new AiService();