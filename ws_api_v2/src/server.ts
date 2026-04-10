import 'dotenv/config';
import { validateEnv } from './config/validateEnv';
import app from './app';
import prisma from './config/db';
import { verifySmtpConnection } from './utils/email';

validateEnv();

const PORT = process.env.PORT || 3000;

// ─── Cron: bodas completadas → readonly ────────────────────────
async function checkCompletedWeddings() {
  try {
    const now = new Date();

    const result = await prisma.wedding.updateMany({
      where: {
        status: 'active',
        wedding_date: { lt: now },
      },
      data: {
        status: 'readonly',
        readonly_reason: 'wedding_completed',
      },
    });

    if (result.count > 0) {
      console.log(`[Cron] ${result.count} boda(s) → readonly (wedding_completed)`);
    }
  } catch (err) {
    console.error('[Cron] Error en checkCompletedWeddings:', err);
  }
}

const server = app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);

  await verifySmtpConnection();

  // Ejecutar al arrancar y luego cada 24h
  await checkCompletedWeddings();
  setInterval(checkCompletedWeddings, 24 * 60 * 60 * 1000);
  console.log('⏰ Cron activado: revisión diaria de bodas completadas');
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

  setTimeout(() => {
    console.error('Forzando cierre por timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => console.error('Unhandled Promise Rejection:', reason));
process.on('uncaughtException',  (err)    => { console.error('Uncaught Exception:', err); shutdown('uncaughtException'); });