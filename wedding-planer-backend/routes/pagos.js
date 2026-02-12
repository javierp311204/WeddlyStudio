const express = require('express');
const router = express.Router();
const { stripe, PLANES } = require('../config/stripe.config');
const Usuario = require('../models/Usuario');
const autenticar = require('../middleware/auth');

// ========================================
// 1. OBTENER PLANES DISPONIBLES
// ========================================
router.get('/planes', (req, res) => {
  try {
    const planesPublicos = Object.entries(PLANES).map(([key, plan]) => ({
      id: key,
      nombre: plan.nombre,
      precio: plan.precio,
      caracteristicas: plan.caracteristicas
    }));

    res.json({ planes: planesPublicos });
  } catch (error) {
    console.error('Error obteniendo planes:', error);
    res.status(500).json({ error: 'Error al obtener planes' });
  }
});

// ========================================
// 2. OBTENER PLAN ACTUAL DEL USUARIO
// ========================================
router.get('/mi-plan', autenticar, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioData.id);
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const planActual = PLANES[usuario.plan];

    res.json({
      plan: usuario.plan,
      subscriptionStatus: usuario.subscriptionStatus,
      subscriptionEndDate: usuario.subscriptionEndDate,
      limites: usuario.limites,
      detallesPlan: {
        nombre: planActual.nombre,
        precio: planActual.precio,
        caracteristicas: planActual.caracteristicas
      }
    });
  } catch (error) {
    console.error('Error obteniendo plan del usuario:', error);
    res.status(500).json({ error: 'Error al obtener plan' });
  }
});

// ========================================
// 3. CREAR SESIÓN DE PAGO (ONE-TIME)
// ========================================
router.post('/crear-sesion-pago-unico', autenticar, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioData.id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log(`💳 Creando sesión de pago ONE-TIME para: ${usuario.email}`);

    // Crear sesión de Stripe Checkout para pago único
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment', // Pago único
      customer_email: usuario.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Wedding Planner - Plan One-Time Premium',
              description: '1 boda lifetime con todas las funciones premium',
            },
            unit_amount: 7900, // $79.00 en centavos
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: usuario._id.toString(),
        plan: 'one_time'
      },
      success_url: `${process.env.FRONTEND_URL}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
    });

    console.log(`✅ Sesión creada: ${session.id}`);
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creando sesión de pago:', error);
    res.status(500).json({ error: 'Error al crear sesión de pago' });
  }
});

// ========================================
// 4. CREAR SUSCRIPCIÓN (UNLIMITED)
// ========================================
router.post('/crear-suscripcion', autenticar, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioData.id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log(`💳 Creando suscripción UNLIMITED para: ${usuario.email}`);

    // Crear o obtener cliente de Stripe
    let customerId = usuario.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: usuario.email,
        metadata: {
          userId: usuario._id.toString()
        }
      });
      customerId = customer.id;
      usuario.stripeCustomerId = customerId;
      await usuario.save();
      console.log(`✅ Cliente Stripe creado: ${customerId}`);
    }

    // Crear sesión de Stripe Checkout para suscripción
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription', // Suscripción recurrente
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Wedding Planner - Plan Unlimited',
              description: 'Bodas y invitados ilimitados con todas las funciones premium',
            },
            unit_amount: 2900, // $29.00 en centavos
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: usuario._id.toString(),
        plan: 'unlimited'
      },
      success_url: `${process.env.FRONTEND_URL}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
    });

    console.log(`✅ Sesión de suscripción creada: ${session.id}`);
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creando suscripción:', error);
    res.status(500).json({ error: 'Error al crear suscripción' });
  }
});

// ========================================
// 5. WEBHOOK DE STRIPE (Eventos de pago)
// ========================================
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 WEBHOOK RECIBIDO');
  console.log('='.repeat(80));
  
  const sig = req.headers['stripe-signature'];
  console.log('📝 Firma recibida:', sig ? 'Presente ✅' : 'Ausente ❌');

  let event;

  try {
    console.log('🔐 Verificando firma del webhook...');
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('✅ Firma verificada correctamente');
    console.log('📦 Tipo de evento:', event.type);
  } catch (err) {
    console.error('❌ Error de verificación de firma:', err.message);
    console.log('='.repeat(80) + '\n');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar el evento
  console.log(`🔄 Procesando evento: ${event.type}`);
  
  switch (event.type) {
    case 'checkout.session.completed':
      console.log('💰 Checkout completado detectado');
      const session = event.data.object;
      console.log('📋 Metadata:', session.metadata);
      await handleCheckoutSessionCompleted(session);
      break;

    case 'customer.subscription.updated':
      console.log('🔄 Suscripción actualizada');
      const subscriptionUpdated = event.data.object;
      await handleSubscriptionUpdated(subscriptionUpdated);
      break;

    case 'customer.subscription.deleted':
      console.log('❌ Suscripción cancelada');
      const subscriptionDeleted = event.data.object;
      await handleSubscriptionDeleted(subscriptionDeleted);
      break;

    default:
      console.log(`⚠️  Evento no manejado: ${event.type}`);
  }

  console.log('='.repeat(80) + '\n');
  res.json({ received: true });
});

// ========================================
// FUNCIONES AUXILIARES PARA WEBHOOKS
// ========================================
async function handleCheckoutSessionCompleted(session) {
  try {
    const userId = session.metadata.userId;
    const plan = session.metadata.plan;

    console.log(`\n🔔 Procesando checkout completado`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Plan: ${plan}`);

    const usuario = await Usuario.findById(userId);
    if (!usuario) {
      console.error(`❌ Usuario no encontrado: ${userId}`);
      return;
    }

    console.log(`✅ Usuario encontrado: ${usuario.email}`);
    console.log(`   Plan actual ANTES: ${usuario.plan}`);
    console.log(`   Límites ANTES: ${JSON.stringify(usuario.limites)}`);

    if (plan === 'one_time') {
      // Pago único
      usuario.plan = 'one_time';
      usuario.subscriptionStatus = 'active';
      
      usuario.limites.maxBodas = PLANES.one_time.limites.maxBodas;
      usuario.limites.maxInvitados = PLANES.one_time.limites.maxInvitados;
      usuario.limites.featuresActivas = PLANES.one_time.limites.featuresActivas;
      
      usuario.paymentHistory.push({
        monto: 79,
        plan: 'one_time',
        stripePaymentId: session.payment_intent,
        tipo: 'one_time'
      });

      console.log(`💎 Aplicando Plan One-Time Premium`);

    } else if (plan === 'unlimited') {
      // Suscripción
      usuario.plan = 'unlimited';
      usuario.subscriptionStatus = 'active';
      usuario.stripeSubscriptionId = session.subscription;
      
      usuario.limites.maxBodas = PLANES.unlimited.limites.maxBodas;
      usuario.limites.maxInvitados = PLANES.unlimited.limites.maxInvitados;
      usuario.limites.featuresActivas = PLANES.unlimited.limites.featuresActivas;
      
      usuario.paymentHistory.push({
        monto: 29,
        plan: 'unlimited',
        stripePaymentId: session.payment_intent,
        tipo: 'subscription'
      });

      console.log(`👑 Aplicando Plan Unlimited`);
    }

    console.log(`💾 Guardando cambios en la base de datos...`);
    await usuario.save();
    
    console.log(`✅ PAGO COMPLETADO Y GUARDADO`);
    console.log(`   Plan actual DESPUÉS: ${usuario.plan}`);
    console.log(`   Límites DESPUÉS: ${JSON.stringify(usuario.limites)}`);
    console.log(`   Status: ${usuario.subscriptionStatus}`);

  } catch (error) {
    console.error('❌ Error en handleCheckoutSessionCompleted:', error);
    console.error('Stack:', error.stack);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    console.log(`\n🔄 Actualizando suscripción: ${subscription.id}`);
    
    const usuario = await Usuario.findOne({ stripeSubscriptionId: subscription.id });
    if (!usuario) {
      console.log('⚠️ No se encontró usuario para la suscripción:', subscription.id);
      return;
    }

    console.log(`✅ Usuario encontrado: ${usuario.email}`);
    
    usuario.subscriptionStatus = subscription.status;
    usuario.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
    await usuario.save();

    console.log(`✅ Suscripción actualizada - Status: ${subscription.status}`);
  } catch (error) {
    console.error('❌ Error en handleSubscriptionUpdated:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    console.log(`\n❌ Cancelando suscripción: ${subscription.id}`);
    
    const usuario = await Usuario.findOne({ stripeSubscriptionId: subscription.id });
    if (!usuario) {
      console.log('⚠️ No se encontró usuario para la suscripción:', subscription.id);
      return;
    }

    console.log(`✅ Usuario encontrado: ${usuario.email}`);
    
    usuario.plan = 'free';
    usuario.subscriptionStatus = 'canceled';
    usuario.limites.maxBodas = PLANES.free.limites.maxBodas;
    usuario.limites.maxInvitados = PLANES.free.limites.maxInvitados;
    usuario.limites.featuresActivas = PLANES.free.limites.featuresActivas;
    usuario.stripeSubscriptionId = null;
    await usuario.save();

    console.log(`✅ Suscripción cancelada - Plan revertido a FREE`);
  } catch (error) {
    console.error('❌ Error en handleSubscriptionDeleted:', error);
  }
}

// ========================================
// 6. CANCELAR SUSCRIPCIÓN
// ========================================
router.post('/cancelar-suscripcion', autenticar, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioData.id);

    if (!usuario || !usuario.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No tienes una suscripción activa' });
    }

    // Cancelar en Stripe
    await stripe.subscriptions.cancel(usuario.stripeSubscriptionId);

    res.json({ 
      mensaje: 'Suscripción cancelada exitosamente. Mantendrás acceso hasta el final del periodo.' 
    });
  } catch (error) {
    console.error('Error cancelando suscripción:', error);
    res.status(500).json({ error: 'Error al cancelar suscripción' });
  }
});

// ========================================
// 7. VERIFICAR LÍMITES (Middleware helper)
// ========================================
router.get('/verificar-limites', autenticar, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioData.id);
    const BodaConfig = require('../models/BodaConfig');

    const bodasActivas = await BodaConfig.countDocuments({ 
      adminEmail: usuario.email 
    });

    const puedeCrearMasBodas = bodasActivas < usuario.limites.maxBodas || 
                                usuario.limites.maxBodas === Infinity;

    res.json({
      plan: usuario.plan,
      limites: usuario.limites,
      uso: {
        bodasActivas,
        puedeCrearMasBodas
      }
    });
  } catch (error) {
    console.error('Error verificando límites:', error);
    res.status(500).json({ error: 'Error al verificar límites' });
  }
});

module.exports = router;