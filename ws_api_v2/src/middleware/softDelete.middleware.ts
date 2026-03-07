import { Prisma } from '@prisma/client';

/**
 * Prisma middleware that intercepts delete operations
 * and converts them into soft deletes (sets deleted_at instead of removing the row).
 * 
 * Models that support soft delete must have a `deleted_at DateTime?` field.
 */
const SOFT_DELETE_MODELS: Prisma.ModelName[] = [
  'User',
  'Wedding',
  'Guest',
  // 'Table',
  // 'Task',
  'Photo',
  // 'Invitation',
  // 'Payment',
];

export const softDeleteMiddleware: Prisma.Middleware = async (params, next) => {
  const modelName = params.model as Prisma.ModelName;

  if (!SOFT_DELETE_MODELS.includes(modelName)) {
    return next(params);
  }

  // Interceptar delete → convertir en update con deleted_at
  if (params.action === 'delete') {
    params.action = 'update';
    params.args.data = { deleted_at: new Date() };
  }

  // Interceptar deleteMany → updateMany con deleted_at
  if (params.action === 'deleteMany') {
    params.action = 'updateMany';
    params.args.data = { deleted_at: new Date() };
  }

  // Filtrar registros eliminados en findMany, findFirst, findUnique, count
  const readActions = ['findMany', 'findFirst', 'findUnique', 'count', 'aggregate'];
  if (readActions.includes(params.action)) {
    if (!params.args) params.args = {};
    if (!params.args.where) params.args.where = {};

    // Solo añadir filtro si no fue ya especificado explícitamente
    if (params.args.where.deleted_at === undefined) {
      params.args.where.deleted_at = null;
    }
  }

  return next(params);
};