// test-webhook.js
// Script para probar manualmente la actualización del plan después de un pago

const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/weddingDB")
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error DB:", err));

const Usuario = require('./models/Usuario');
const { PLANES } = require('./config/stripe.config');

async function simularPagoExitoso(email, planId) {
  try {
    console.log(`\n🧪 Simulando pago exitoso para: ${email}`);
    console.log(`📦 Plan seleccionado: ${planId}\n`);

    const usuario = await Usuario.findOne({ email: email.toLowerCase() });

    if (!usuario) {
      console.error('❌ Usuario no encontrado');
      process.exit(1);
    }

    console.log('📋 Estado ANTES del pago:');
    console.log(`   Plan: ${usuario.plan}`);
    console.log(`   Límites: ${JSON.stringify(usuario.limites)}`);
    console.log(`   Status: ${usuario.subscriptionStatus}`);

    // Simular actualización del webhook
    if (planId === 'one_time') {
      usuario.plan = 'one_time';
      usuario.subscriptionStatus = 'active';
      usuario.limites.maxBodas = PLANES.one_time.limites.maxBodas;
      usuario.limites.maxInvitados = PLANES.one_time.limites.maxInvitados;
      usuario.limites.featuresActivas = PLANES.one_time.limites.featuresActivas;
      
      usuario.paymentHistory.push({
        monto: 79,
        plan: 'one_time',
        stripePaymentId: 'pi_test_' + Date.now(),
        tipo: 'one_time'
      });

      console.log('\n💎 Aplicando Plan One-Time Premium...');

    } else if (planId === 'unlimited') {
      usuario.plan = 'unlimited';
      usuario.subscriptionStatus = 'active';
      usuario.stripeSubscriptionId = 'sub_test_' + Date.now();
      usuario.limites.maxBodas = PLANES.unlimited.limites.maxBodas;
      usuario.limites.maxInvitados = PLANES.unlimited.limites.maxInvitados;
      usuario.limites.featuresActivas = PLANES.unlimited.limites.featuresActivas;
      
      usuario.paymentHistory.push({
        monto: 29,
        plan: 'unlimited',
        stripePaymentId: 'pi_test_' + Date.now(),
        tipo: 'subscription'
      });

      console.log('\n👑 Aplicando Plan Unlimited...');
    }

    await usuario.save();

    console.log('\n📋 Estado DESPUÉS del pago:');
    console.log(`   Plan: ${usuario.plan}`);
    console.log(`   Límites: ${JSON.stringify(usuario.limites)}`);
    console.log(`   Status: ${usuario.subscriptionStatus}`);
    console.log(`   Historial de pagos: ${usuario.paymentHistory.length} pago(s)`);

    console.log('\n✅ Simulación completada exitosamente\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error en la simulación:', error);
    process.exit(1);
  }
}


const args = process.argv.slice(2);
const email = args[0];
const plan = args[1];

if (!email || !plan) {
  console.log('\n📖 Uso: node test-webhook.js <email> <plan>');
  console.log('   Planes disponibles: one_time, unlimited\n');
  console.log('Ejemplo:');
  console.log('   node test-webhook.js usuario@example.com one_time\n');
  process.exit(1);
}

if (!['one_time', 'unlimited'].includes(plan)) {
  console.error('❌ Plan inválido. Usa: one_time o unlimited');
  process.exit(1);
}

simularPagoExitoso(email, plan);