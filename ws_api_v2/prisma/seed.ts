
import { PrismaClient, GlobalRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─────────────────────────────────────────────
  // PLANES
  // ─────────────────────────────────────────────
  const planFree = await prisma.plan.upsert({
    where: { name: 'free' },
    update: {},
    create: {
      name: 'free',
      price: 0,
      currency: 'EUR',
      max_weddings: 1,
      max_photos: 20,
      max_guests: 40,
      features_json: {
        checklist: 'limited',
        drag_drop_tables: false,
        premium_stationery: false,
        google_calendar: false,
        photo_moderation: false,
        pdf_export: false,
        planner_dashboard: false,
      },
    },
  });

  const planOneTime = await prisma.plan.upsert({
    where: { name: 'one_time' },
    update: {},
    create: {
      name: 'one_time',
      price: 79.00,
      currency: 'EUR',
      max_weddings: 1,
      max_photos: 80,
      max_guests: -1, // ilimitado
      features_json: {
        checklist: 'full',
        drag_drop_tables: true,
        premium_stationery: true,
        google_calendar: true,
        photo_moderation: true,
        pdf_export: true,
        planner_dashboard: false,
      },
    },
  });

  const planSubscription = await prisma.plan.upsert({
    where: { name: 'subscription' },
    update: {},
    create: {
      name: 'subscription',
      price: 29.00,
      currency: 'EUR',
      max_weddings: -1, // ilimitado
      max_photos: 80,   // por boda
      max_guests: -1,   // ilimitado
      features_json: {
        checklist: 'full',
        drag_drop_tables: true,
        premium_stationery: true,
        google_calendar: true,
        photo_moderation: true,
        pdf_export: true,
        planner_dashboard: true,
      },
    },
  });

  console.log('✅ Planes creados:', planFree.name, planOneTime.name, planSubscription.name);

  // ─────────────────────────────────────────────
  // USUARIO ADMIN
  // ─────────────────────────────────────────────
  // const adminEmail = process.env.ADMIN_EMAIL || 'admin@weddly.com';
  // const adminPassword = process.env.ADMIN_PASSWORD || 'Admin1234!';
  const adminEmail = 'admin@weddly.com';
  const adminPassword = 'Admin1234!';

  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!adminExists) {
    const password_hash = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        first_name: 'Admin',
        last_name: 'Weddly',
        email: adminEmail,
        password_hash,
        role_global: GlobalRole.admin,
        language: 'es',
      },
    });
    console.log('✅ Admin creado:', admin.email);
  } else {
    console.log('ℹ️  Admin ya existe:', adminEmail);
  }

  console.log('🎉 Seed completado');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });