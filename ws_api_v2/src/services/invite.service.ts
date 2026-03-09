import crypto from 'crypto';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { sendCollaboratorInviteEmail } from '../utils/email';
import { SendInviteInput } from '../schemas/invite.schema';

export class InviteService {

  // ─── POST /api/weddings/:id/invites ──────────────────────────
  async sendInvite(weddingId: string, requesterId: string, data: SendInviteInput) {

    // 1. Verificar que el requester es owner o co_organizer
    const requesterRole = await prisma.userWeddingRole.findFirst({
      where: { wedding_id: weddingId, user_id: requesterId,
               role: { in: ['owner', 'co_organizer'] } },
    });
    if (!requesterRole) throw new AppError('No tienes permisos para invitar colaboradores', 403);

    // 2. Obtener datos de la boda
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { id: true, name: true, wedding_date: true },
    });
    if (!wedding) throw new AppError('Boda no encontrada', 404);

    // 3. Verificar que el invitado no es ya miembro
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existingUser) {
      const alreadyMember = await prisma.userWeddingRole.findFirst({
        where: { wedding_id: weddingId, user_id: existingUser.id },
      });
      if (alreadyMember) throw new AppError('Este usuario ya es miembro de la boda', 409);
    }

    // 4. Verificar que no hay invitación pendiente para este email+boda
    const existingInvite = await prisma.weddingInvite.findFirst({
      where: { wedding_id: weddingId, email: data.email, accepted_at: null,
               expires_at: { gt: new Date() } },
    });
    if (existingInvite) throw new AppError('Ya existe una invitación pendiente para este email', 409);

    // 5. Obtener datos del invitador
    const inviter = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { first_name: true, last_name: true },
    });

    // 6. Crear token y guardar invitación
    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

    await prisma.weddingInvite.create({
      data: { wedding_id: weddingId, invited_by: requesterId,
              email: data.email, role: data.role, token, expires_at: expiresAt },
    });

    // 7. Enviar email
    const inviterName = `${inviter?.first_name ?? ''} ${inviter?.last_name ?? ''}`.trim();
    await sendCollaboratorInviteEmail({
      to:          data.email,
      inviterName,
      weddingName: wedding.name,
      role:        data.role,
      token,
    });

    // 8. Registrar en activity_logs
    await prisma.activityLog.create({
      data: {
        user_id:     requesterId,
        wedding_id:  weddingId,
        entity_type: 'wedding_invite',
        entity_id:   token,
        action:      'invite_sent',
        new_value_json: { email: data.email, role: data.role },
      },
    });

    return { message: `Invitación enviada a ${data.email}` };
  }

  // ─── GET /api/invites/accept/:token ──────────────────────────
  async acceptInvite(token: string, userId: string) {

    // 1. Buscar invitación válida
    const invite = await prisma.weddingInvite.findUnique({
      where: { token },
      include: { wedding: { select: { id: true, name: true } } },
    });

    if (!invite)              throw new AppError('Invitación no encontrada', 404);
    if (invite.accepted_at)   throw new AppError('Esta invitación ya fue aceptada', 409);
    if (invite.expires_at < new Date()) throw new AppError('La invitación ha expirado', 410);

    // 2. Verificar que el email del usuario coincide
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email !== invite.email) {
      throw new AppError('Esta invitación no corresponde a tu cuenta', 403);
    }

    // 3. Verificar que no es ya miembro
    const alreadyMember = await prisma.userWeddingRole.findFirst({
      where: { wedding_id: invite.wedding_id, user_id: userId },
    });
    if (alreadyMember) throw new AppError('Ya eres miembro de esta boda', 409);

    // 4. Insertar rol + marcar invitación como aceptada (transacción)
    await prisma.$transaction([
      prisma.userWeddingRole.create({
        data: { user_id: userId, wedding_id: invite.wedding_id, role: invite.role },
      }),
      prisma.weddingInvite.update({
        where: { token },
        data:  { accepted_at: new Date() },
      }),
    ]);

    // 5. Registrar en activity_logs
    await prisma.activityLog.create({
      data: {
        user_id:     userId,
        wedding_id:  invite.wedding_id,
        entity_type: 'wedding_invite',
        entity_id:   token,
        action:      'invite_accepted',
        new_value_json: { role: invite.role },
      },
    });

    return {
      message:    'Invitación aceptada correctamente',
      wedding_id: invite.wedding_id,
      wedding_name: invite.wedding.name,
      role:       invite.role,
    };
  }

  // ─── GET /api/weddings/:id/invites ───────────────────────────
  async getInvites(weddingId: string, requesterId: string) {
    const role = await prisma.userWeddingRole.findFirst({
      where: { wedding_id: weddingId, user_id: requesterId,
               role: { in: ['owner', 'co_organizer'] } },
    });
    if (!role) throw new AppError('No tienes acceso a esta información', 403);

    return prisma.weddingInvite.findMany({
      where: { wedding_id: weddingId },
      select: {
        id: true, email: true, role: true,
        expires_at: true, accepted_at: true, created_at: true,
        inviter: { select: { first_name: true, last_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ─── DELETE /api/weddings/:id/invites/:inviteId ───────────────
  async revokeInvite(weddingId: string, requesterId: string, inviteId: string) {
    // Solo owner puede revocar
    const role = await prisma.userWeddingRole.findFirst({
      where: { wedding_id: weddingId, user_id: requesterId, role: 'owner' },
    });
    if (!role) throw new AppError('Solo el owner puede revocar invitaciones', 403);

    const invite = await prisma.weddingInvite.findFirst({
      where: { id: inviteId, wedding_id: weddingId },
    });
    if (!invite) throw new AppError('Invitación no encontrada', 404);

    await prisma.weddingInvite.delete({ where: { id: inviteId } });

    await prisma.activityLog.create({
      data: {
        user_id:     requesterId,
        wedding_id:  weddingId,
        entity_type: 'wedding_invite',
        entity_id:   inviteId,
        action:      'invite_revoked',
      },
    });

    return { message: 'Invitación revocada correctamente' };
  }

  // ─── DELETE /api/weddings/:id/members/:memberId ───────────────
  async revokeMember(weddingId: string, requesterId: string, memberId: string) {
    // Solo owner puede revocar miembros
    const requesterRole = await prisma.userWeddingRole.findFirst({
      where: { wedding_id: weddingId, user_id: requesterId, role: 'owner' },
    });
    if (!requesterRole) throw new AppError('Solo el owner puede revocar miembros', 403);

    // No puede revocarse a sí mismo si es el único owner
    if (memberId === requesterId) {
      throw new AppError('No puedes revocarte a ti mismo como owner', 400);
    }

    const memberRole = await prisma.userWeddingRole.findFirst({
      where: { wedding_id: weddingId, user_id: memberId },
    });
    if (!memberRole) throw new AppError('Este usuario no es miembro de la boda', 404);

    await prisma.userWeddingRole.deleteMany({
      where: { wedding_id: weddingId, user_id: memberId },
    });

    await prisma.activityLog.create({
      data: {
        user_id:     requesterId,
        wedding_id:  weddingId,
        entity_type: 'user_wedding_role',
        entity_id:   memberId,
        action:      'member_revoked',
        old_value_json: { role: memberRole.role },
      },
    });

    return { message: 'Acceso revocado correctamente' };
  }

  // ─── GET /api/invites/preview/:token ─────────────────────────
  // Público — para mostrar info antes de que el usuario haga login
  async previewInvite(token: string) {
    const invite = await prisma.weddingInvite.findUnique({
      where: { token },
      select: {
        email: true, role: true, expires_at: true, accepted_at: true,
        wedding: { select: { name: true, wedding_date: true, location_name: true } },
        inviter: { select: { first_name: true, last_name: true } },
      },
    });

    if (!invite)            throw new AppError('Invitación no encontrada', 404);
    if (invite.accepted_at) throw new AppError('Esta invitación ya fue aceptada', 409);
    if (invite.expires_at < new Date()) throw new AppError('La invitación ha expirado', 410);

    return invite;
  }
}

export default new InviteService();