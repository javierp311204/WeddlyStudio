import { PrismaClient } from '@prisma/client';
import { softDeleteMiddleware } from '../middleware/softDelete.middleware';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Registrar middleware de soft delete
prisma.$use(softDeleteMiddleware);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;