import 'dotenv/config';
import app from './app';
import prisma from './config/db';
import { verifySmtpConnection } from './utils/email';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);

  // Verificar conexión SMTP al arrancar
  await verifySmtpConnection();
});

// ─── Graceful shutdown ──────────────────────────────────────────
const shutdown = async (signal: string) => {
  console.log(`\n${signal} recibido. Cerrando servidor...`);

  server.close(async () => {
    console.log('Conexiones HTTP cerradas');

    await prisma.$disconnect();
    console.log('Conexión a PostgreSQL cerrada');

    process.exit(0);
  });

  // Forzar cierre después de 10s si no termina
  setTimeout(() => {
    console.error('Forzando cierre por timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown('uncaughtException');
});