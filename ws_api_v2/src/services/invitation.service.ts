import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { sendInvitationEmail } from '../utils/email';
import {
  CreateInvitationInput,
  UpdateInvitationInput,
  SendInvitationInput,
  ListSendsQuery,
} from '../schemas/invitation.schema';

export class InvitationService {
  // ─── Helpers privados ──────────────────────────────────────────

  private async assertWeddingAccess(weddingId: string, userId: string) {
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: { user_roles: { where: { user_id: userId }, take: 1 } },
    });

    if (!wedding) throw new AppError('Boda no encontrada', 404);

    const hasAccess = wedding.created_by === userId || wedding.user_roles.length > 0;
    if (!hasAccess) throw new AppError('No tienes acceso a esta boda', 403);

    return wedding;
  }

  private async assertInvitationAccess(invitationId: string, userId: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        wedding: {
          include: { user_roles: { where: { user_id: userId }, take: 1 } },
        },
      },
    });

    if (!invitation) throw new AppError('Invitación no encontrada', 404);

    const hasAccess =
      invitation.wedding.created_by === userId ||
      invitation.wedding.user_roles.length > 0;
    if (!hasAccess) throw new AppError('No tienes acceso a esta invitación', 403);

    return invitation;
  }

  private assertCreatorOrPlanner(
    wedding: { created_by: string; user_roles: { role: string }[] },
    userId: string,
  ) {
    const isCreator = wedding.created_by === userId;
    const isPlanner = wedding.user_roles.some(r => r.role === 'planner');
    if (!isCreator && !isPlanner) {
      throw new AppError('Solo el creador o planner pueden realizar esta acción', 403);
    }
  }

  // ─── Endpoints ────────────────────────────────────────────────

  /**
   * GET /api/weddings/:weddingId/invitations
   * Lista todas las invitaciones de la boda (normalmente 1, pero el schema permite N).
   */
  async getAll(weddingId: string, userId: string) {
    await this.assertWeddingAccess(weddingId, userId);

    return prisma.invitation.findMany({
      where: { wedding_id: weddingId },
      include: {
        _count: { select: { sends: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * GET /api/invitations/:invitationId
   * Detalle de una invitación.
   */
  async getById(invitationId: string, userId: string) {
    const invitation = await this.assertInvitationAccess(invitationId, userId);

    return prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        wedding: {
          select: {
            id: true,
            name: true,
            wedding_date: true,
            location_name: true,
            rsvp_deadline: true,
          },
        },
        _count: { select: { sends: true } },
      },
    });
  }

  /**
   * POST /api/weddings/:weddingId/invitations
   * Crea el diseño de la invitación.
   */
  async create(weddingId: string, userId: string, data: CreateInvitationInput) {
    const wedding = await this.assertWeddingAccess(weddingId, userId);
    this.assertCreatorOrPlanner(wedding, userId);

    const invitation = await prisma.invitation.create({
      data: {
        wedding_id: weddingId,
        template_type: data.template_type,
        background: data.background,
        primary_color: data.primary_color ?? '#8B6F47',
        secondary_color: data.secondary_color ?? '#D4AF87',
        custom_text: data.custom_text,
      },
    });

    return invitation;
  }

  /**
   * PATCH /api/invitations/:invitationId
   * Actualiza el diseño de la invitación.
   */
  async update(invitationId: string, userId: string, data: UpdateInvitationInput) {
    const invitation = await this.assertInvitationAccess(invitationId, userId);
    this.assertCreatorOrPlanner(invitation.wedding, userId);

    return prisma.invitation.update({
      where: { id: invitationId },
      data,
    });
  }

  /**
   * POST /api/invitations/:invitationId/send
   * Envío masivo de invitaciones por email.
   * Crea un InvitationSend por cada guest procesado.
   *
   * Estrategia: procesar en lotes de 20 para no saturar el SMTP.
   */
  async send(invitationId: string, userId: string, data: SendInvitationInput) {
    const invitation = await this.assertInvitationAccess(invitationId, userId);
    this.assertCreatorOrPlanner(invitation.wedding, userId);

    const { wedding } = invitation;

    // Obtener lista de invitados a enviar
    let guests = await prisma.guest.findMany({
      where: {
        wedding_id: wedding.id,
        // Solo invitados principales (no acompañantes)
        parent_guest_id: null,
        // Solo los que tienen email
        email: { not: null },
        // Filtrar por guest_ids si no es send_to_all
        ...(data.send_to_all ? {} : { id: { in: data.guest_ids } }),
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        invitation_code: true,
      },
    });

    if (guests.length === 0) {
      throw new AppError(
        'No hay invitados con email para enviar. Asegúrate de que los invitados tienen email registrado.',
        400,
      );
    }

    // Detectar guests ya enviados (para no duplicar)
    const alreadySent = await prisma.invitationSend.findMany({
      where: {
        invitation_id: invitationId,
        status: 'sent',
        guest_id: { in: guests.map(g => g.id) },
      },
      select: { guest_id: true },
    });

    const alreadySentIds = new Set(alreadySent.map(s => s.guest_id));
    const pendingGuests = guests.filter(g => !alreadySentIds.has(g.id));

    if (pendingGuests.length === 0) {
      return {
        sent: 0,
        failed: 0,
        skipped: guests.length,
        message: 'Todos los invitados ya recibieron esta invitación anteriormente',
      };
    }

    // Procesar en lotes de 20
    const BATCH_SIZE = 20;
    let sent = 0;
    let failed = 0;
    const failedGuests: { guest_id: string; error: string }[] = [];

    for (let i = 0; i < pendingGuests.length; i += BATCH_SIZE) {
      const batch = pendingGuests.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (guest) => {
          const emailResult = await sendInvitationEmail({
            to: guest.email!,
            guestName: `${guest.first_name} ${guest.last_name ?? ''}`.trim(),
            weddingName: wedding.name,
            weddingDate: wedding.wedding_date,
            locationName: wedding.location_name,
            customText: invitation.custom_text,
            rsvpCode: guest.invitation_code!,
            primaryColor: invitation.primary_color ?? '#8B6F47',
            secondaryColor: invitation.secondary_color ?? '#D4AF87',
            template: invitation.template_type as any,
          });

          return { guest, emailResult };
        }),
      );

      // Registrar resultados en InvitationSend
      const sendRecords = results.map((result, idx) => {
        if (result.status === 'fulfilled' && result.value.emailResult.success) {
          sent++;
          return {
            invitation_id: invitationId,
            guest_id: batch[idx].id,
            sent_by: userId,
            status: 'sent' as const,
          };
        } else {
          const error =
            result.status === 'rejected'
              ? result.reason?.message
              : result.value.emailResult.error;
          failed++;
          failedGuests.push({ guest_id: batch[idx].id, error });
          return {
            invitation_id: invitationId,
            guest_id: batch[idx].id,
            sent_by: userId,
            status: 'failed' as const,
            error_message: error,
          };
        }
      });

      await prisma.invitationSend.createMany({ data: sendRecords });

      // Pequeña pausa entre lotes para no saturar SMTP
      if (i + BATCH_SIZE < pendingGuests.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return {
      sent,
      failed,
      skipped: alreadySentIds.size,
      total_processed: pendingGuests.length,
      message: `${sent} invitaciones enviadas correctamente${failed > 0 ? `, ${failed} fallaron` : ''}`,
      ...(failedGuests.length > 0 && { failed_details: failedGuests }),
    };
  }

  /**
   * GET /api/invitations/:invitationId/sends
   * Historial de envíos con paginación.
   */
  async getSends(invitationId: string, userId: string, filters: ListSendsQuery) {
    await this.assertInvitationAccess(invitationId, userId);

    const where = {
      invitation_id: invitationId,
      ...(filters.status && { status: filters.status }),
    };

    const [sends, total] = await Promise.all([
      prisma.invitationSend.findMany({
        where,
        include: {
          guest: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              rsvp_status: true,
            },
          },
          sender: {
            select: { id: true, first_name: true, last_name: true },
          },
        },
        orderBy: { sent_at: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.invitationSend.count({ where }),
    ]);

    // Stats rápidas del envío
    const stats = await prisma.invitationSend.groupBy({
      by: ['status'],
      where: { invitation_id: invitationId },
      _count: { id: true },
    });

    const statsMap = stats.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = s._count.id;
      return acc;
    }, {});

    return {
      sends,
      stats: {
        total_sent: statsMap['sent'] ?? 0,
        total_failed: statsMap['failed'] ?? 0,
      },
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        total_pages: Math.ceil(total / filters.limit),
        has_next: filters.page * filters.limit < total,
      },
    };
  }

  /**
   * DELETE /api/invitations/:invitationId
   * Elimina el diseño de la invitación (y sus sends en cascade por FK).
   */
  async remove(invitationId: string, userId: string) {
    const invitation = await this.assertInvitationAccess(invitationId, userId);
    this.assertCreatorOrPlanner(invitation.wedding, userId);

    await prisma.invitation.delete({ where: { id: invitationId } });

    return { message: 'Invitación eliminada correctamente' };
  }

  /**
   * POST /api/invitations/:invitationId/resend/:guestId
   * Reenvía la invitación a un invitado concreto (aunque ya se le haya enviado).
   */
  async resend(invitationId: string, guestId: string, userId: string) {
    const invitation = await this.assertInvitationAccess(invitationId, userId);
    this.assertCreatorOrPlanner(invitation.wedding, userId);

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        invitation_code: true,
        wedding_id: true,
      },
    });

    if (!guest) throw new AppError('Invitado no encontrado', 404);
    if (guest.wedding_id !== invitation.wedding_id) {
      throw new AppError('El invitado no pertenece a esta boda', 400);
    }
    if (!guest.email) {
      throw new AppError('El invitado no tiene email registrado', 400);
    }
    if (!guest.invitation_code) {
      throw new AppError('El invitado no tiene código de invitación', 400);
    }

    const { wedding } = invitation;

    const emailResult = await sendInvitationEmail({
      to: guest.email,
      guestName: `${guest.first_name} ${guest.last_name ?? ''}`.trim(),
      weddingName: wedding.name,
      weddingDate: wedding.wedding_date,
      locationName: wedding.location_name,
      customText: invitation.custom_text,
      rsvpCode: guest.invitation_code,
      primaryColor: invitation.primary_color ?? '#8B6F47',
      secondaryColor: invitation.secondary_color ?? '#D4AF87',
      template: invitation.template_type as any,
    });

    // Registrar el reenvío
    const send = await prisma.invitationSend.create({
      data: {
        invitation_id: invitationId,
        guest_id: guestId,
        sent_by: userId,
        status: emailResult.success ? 'sent' : 'failed',
        error_message: emailResult.error,
      },
    });

    if (!emailResult.success) {
      throw new AppError(`Error al reenviar: ${emailResult.error}`, 500);
    }

    return { message: 'Invitación reenviada correctamente', send };
  }
}

export default new InvitationService();