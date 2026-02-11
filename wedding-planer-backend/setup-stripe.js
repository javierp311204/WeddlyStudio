require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function configurarStripe() {
  console.log('🚀 Iniciando configuración de Stripe...\n');

  try {
    // ============================================
    // 1. CREAR PRODUCTO ONE-TIME
    // ============================================
    console.log('📦 Creando producto One-Time Premium...');
    const productoOneTime = await stripe.products.create({
      name: 'Wedding Planner - One-Time Premium',
      description: '1 boda lifetime con todas las funciones premium',
      metadata: {
        plan_id: 'one_time',
        max_bodas: '1',
        max_invitados: '300'
      }
    });
    console.log(`✅ Producto creado: ${productoOneTime.id}`);

    // Crear precio para One-Time
    console.log('💰 Creando precio One-Time ($79 USD)...');
    const precioOneTime = await stripe.prices.create({
      product: productoOneTime.id,
      unit_amount: 7900, // $79.00 en centavos
      currency: 'usd',
      metadata: {
        plan_id: 'one_time'
      }
    });
    console.log(`✅ Precio creado: ${precioOneTime.id}\n`);

    // ============================================
    // 2. CREAR PRODUCTO UNLIMITED
    // ============================================
    console.log('📦 Creando producto Unlimited...');
    const productoUnlimited = await stripe.products.create({
      name: 'Wedding Planner - Plan Unlimited',
      description: 'Bodas y invitados ilimitados con todas las funciones premium',
      metadata: {
        plan_id: 'unlimited',
        max_bodas: 'unlimited',
        max_invitados: 'unlimited'
      }
    });
    console.log(`✅ Producto creado: ${productoUnlimited.id}`);

    // Crear precio para Unlimited (suscripción mensual)
    console.log('💰 Creando precio Unlimited ($29 USD/mes)...');
    const precioUnlimited = await stripe.prices.create({
      product: productoUnlimited.id,
      unit_amount: 2900, // $29.00 en centavos
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan_id: 'unlimited'
      }
    });
    console.log(`✅ Precio creado: ${precioUnlimited.id}\n`);

    // ============================================
    // 3. MOSTRAR RESUMEN
    // ============================================
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ CONFIGURACIÓN COMPLETADA CON ÉXITO');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📋 Agrega estas líneas a tu archivo .env:\n');
    console.log(`STRIPE_PRICE_ONE_TIME=${precioOneTime.id}`);
    console.log(`STRIPE_PRICE_UNLIMITED=${precioUnlimited.id}\n`);

    console.log('⚠️  SIGUIENTE PASO: Configurar el Webhook');
    console.log('═══════════════════════════════════════════════════════');
    console.log('1. Ve a: https://dashboard.stripe.com/test/webhooks');
    console.log('2. Click en "Add endpoint"');
    console.log('3. URL: http://localhost:3000/api/pagos/webhook');
    console.log('4. Selecciona estos eventos:');
    console.log('   • checkout.session.completed');
    console.log('   • customer.subscription.updated');
    console.log('   • customer.subscription.deleted');
    console.log('5. Copia el "Signing secret" (whsec_...)');
    console.log('6. Agrégalo al .env como STRIPE_WEBHOOK_SECRET=whsec_...\n');

  } catch (error) {
    console.error('❌ Error configurando Stripe:', error.message);
    process.exit(1);
  }
}

configurarStripe();