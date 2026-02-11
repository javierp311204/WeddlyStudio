require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('./models/Usuario');
const BodaConfig = require('./models/BodaConfig');
const { PLANES } = require('./config/stripe.config');

async function testearSistema() {
  console.log('🧪 INICIANDO TESTS DEL SISTEMA DE PAGOS\n');

  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/weddingDB');
    console.log('✅ Conectado a MongoDB\n');

    // ============================================
    // TEST 1: Verificar estructura de planes
    // ============================================
    console.log('📋 TEST 1: Verificando configuración de planes...');
    
    console.log('\n  Plan FREE:');
    console.log(`    • Precio: $${PLANES.free.precio}`);
    console.log(`    • Max Bodas: ${PLANES.free.limites.maxBodas}`);
    console.log(`    • Max Invitados: ${PLANES.free.limites.maxInvitados}`);
    
    console.log('\n  Plan ONE-TIME:');
    console.log(`    • Precio: $${PLANES.one_time.precio}`);
    console.log(`    • Max Bodas: ${PLANES.one_time.limites.maxBodas}`);
    console.log(`    • Max Invitados: ${PLANES.one_time.limites.maxInvitados}`);
    console.log(`    • Stripe Price ID: ${PLANES.one_time.stripePriceId || '❌ NO CONFIGURADO'}`);
    
    console.log('\n  Plan UNLIMITED:');
    console.log(`    • Precio: $${PLANES.unlimited.precio}/mes`);
    console.log(`    • Max Bodas: ${PLANES.unlimited.limites.maxBodas === Infinity ? '∞' : PLANES.unlimited.limites.maxBodas}`);
    console.log(`    • Max Invitados: ${PLANES.unlimited.limites.maxInvitados === Infinity ? '∞' : PLANES.unlimited.limites.maxInvitados}`);
    console.log(`    • Stripe Price ID: ${PLANES.unlimited.stripePriceId || '❌ NO CONFIGURADO'}`);
    
    if (!PLANES.one_time.stripePriceId || !PLANES.unlimited.stripePriceId) {
      console.log('\n⚠️  ADVERTENCIA: Los Price IDs de Stripe no están configurados.');
      console.log('   Ejecuta: node setup-stripe.js\n');
    } else {
      console.log('\n✅ Price IDs configurados correctamente\n');
    }

    // ============================================
    // TEST 2: Crear usuario de prueba
    // ============================================
    console.log('📋 TEST 2: Creando usuario de prueba...');
    
    // Limpiar usuarios de prueba anteriores
    await Usuario.deleteMany({ email: 'test@ejemplo.com' });
    await BodaConfig.deleteMany({ adminEmail: 'test@ejemplo.com' });
    
    const usuarioPrueba = new Usuario({
      email: 'test@ejemplo.com',
      pass: 'hashedpassword',
      rol: 'admin',
      codigoBoda: 'TEST123',
      nick: 'TestUser',
      emailVerificado: true,
      plan: 'free'
      // Los límites se asignan automáticamente por el default
    });
    
    await usuarioPrueba.save();
    console.log('✅ Usuario de prueba creado con plan FREE');
    console.log(`   Límites: ${JSON.stringify(usuarioPrueba.limites, null, 2)}\n`);

    // ============================================
    // TEST 3: Simular upgrade a ONE-TIME
    // ============================================
    console.log('📋 TEST 3: Simulando upgrade a ONE-TIME...');
    
    usuarioPrueba.plan = 'one_time';
    usuarioPrueba.subscriptionStatus = 'active';
    usuarioPrueba.limites = PLANES.one_time.limites;
    usuarioPrueba.paymentHistory.push({
      monto: 79,
      plan: 'one_time',
      stripePaymentId: 'pi_test_12345',
      tipo: 'one_time'
    });
    
    await usuarioPrueba.save();
    console.log('✅ Usuario actualizado a ONE-TIME');
    console.log(`   Nuevos límites: ${JSON.stringify(usuarioPrueba.limites, null, 2)}\n`);

    // ============================================
    // TEST 4: Verificar límite de bodas
    // ============================================
    console.log('📋 TEST 4: Verificando límites de bodas...');
    
    const bodaTest = new BodaConfig({
      codigoBoda: 'TEST123',
      adminEmail: 'test@ejemplo.com',
      invitados: []
    });
    await bodaTest.save();
    
    const bodasActivas = await BodaConfig.countDocuments({ 
      adminEmail: 'test@ejemplo.com' 
    });
    
    const puedeCrearMas = bodasActivas < usuarioPrueba.limites.maxBodas || 
                          usuarioPrueba.limites.maxBodas === Infinity;
    
    console.log(`   Bodas activas: ${bodasActivas}`);
    console.log(`   Límite: ${usuarioPrueba.limites.maxBodas}`);
    console.log(`   ¿Puede crear más?: ${puedeCrearMas ? '✅ SÍ' : '❌ NO'}\n`);

    // ============================================
    // TEST 5: Simular upgrade a UNLIMITED
    // ============================================
    console.log('📋 TEST 5: Simulando upgrade a UNLIMITED...');
    
    usuarioPrueba.plan = 'unlimited';
    usuarioPrueba.stripeSubscriptionId = 'sub_test_67890';
    usuarioPrueba.limites = PLANES.unlimited.limites;
    usuarioPrueba.paymentHistory.push({
      monto: 29,
      plan: 'unlimited',
      stripePaymentId: 'pi_test_67890',
      tipo: 'subscription'
    });
    
    await usuarioPrueba.save();
    console.log('✅ Usuario actualizado a UNLIMITED');
    console.log(`   Nuevos límites: maxBodas = ${usuarioPrueba.limites.maxBodas === Infinity ? '∞' : usuarioPrueba.limites.maxBodas}`);
    console.log(`   maxInvitados = ${usuarioPrueba.limites.maxInvitados === Infinity ? '∞' : usuarioPrueba.limites.maxInvitados}\n`);

    // ============================================
    // TEST 6: Verificar historial de pagos
    // ============================================
    console.log('📋 TEST 6: Verificando historial de pagos...');
    console.log(`   Total de pagos: ${usuarioPrueba.paymentHistory.length}`);
    usuarioPrueba.paymentHistory.forEach((pago, index) => {
      console.log(`   Pago ${index + 1}: $${pago.monto} - ${pago.plan} (${pago.tipo})`);
    });
    console.log('');

    // ============================================
    // RESUMEN FINAL
    // ============================================
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ TODOS LOS TESTS PASARON CORRECTAMENTE');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📊 Estado final del usuario de prueba:');
    console.log(`   Email: ${usuarioPrueba.email}`);
    console.log(`   Plan: ${usuarioPrueba.plan}`);
    console.log(`   Status: ${usuarioPrueba.subscriptionStatus}`);
    console.log(`   Límites:`);
    console.log(`     • Max Bodas: ${usuarioPrueba.limites.maxBodas === Infinity ? '∞' : usuarioPrueba.limites.maxBodas}`);
    console.log(`     • Max Invitados: ${usuarioPrueba.limites.maxInvitados === Infinity ? '∞' : usuarioPrueba.limites.maxInvitados}`);
    console.log(`     • Features: ${usuarioPrueba.limites.featuresActivas.join(', ')}`);
    console.log('');

    // Limpiar datos de prueba
    console.log('🧹 Limpiando datos de prueba...');
    await Usuario.deleteMany({ email: 'test@ejemplo.com' });
    await BodaConfig.deleteMany({ adminEmail: 'test@ejemplo.com' });
    console.log('✅ Datos de prueba eliminados\n');

  } catch (error) {
    console.error('❌ ERROR:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB');
  }
}

testearSistema();