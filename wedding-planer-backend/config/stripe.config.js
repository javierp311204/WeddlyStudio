// ⚠️ IMPORTANTE: Cargar dotenv ANTES de inicializar Stripe
require('dotenv').config();

// Verificar que la API key existe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ ERROR: STRIPE_SECRET_KEY no está definida en .env');
  console.error('Por favor agrega: STRIPE_SECRET_KEY=sk_test_...');
  process.exit(1);
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

console.log('✅ Stripe inicializado correctamente');

// Configuración de planes
const PLANES = {
  free: {
    nombre: 'Free',
    precio: 0,
    stripePriceId: null, // Plan gratuito, no necesita Stripe
    caracteristicas: [
      '1 boda activa',
      'Hasta 50 invitados',
      'Funciones básicas',
      'Plantillas estándar'
    ],
    limites: {
      maxBodas: 1,
      maxInvitados: 50,
      featuresActivas: ['basicas']
    }
  },
  one_time: {
    nombre: 'One-Time Premium',
    precio: 79,
    stripePriceId: process.env.STRIPE_PRICE_ONE_TIME || null,
    caracteristicas: [
      '1 boda lifetime',
      'Hasta 300 invitados',
      'Todas las funciones premium',
      'Plantillas premium',
      'Soporte prioritario'
    ],
    limites: {
      maxBodas: 1,
      maxInvitados: 300,
      featuresActivas: ['basicas', 'premium']
    }
  },
  unlimited: {
    nombre: 'Unlimited',
    precio: 29,
    stripePriceId: process.env.STRIPE_PRICE_UNLIMITED || null,
    caracteristicas: [
      'Bodas ilimitadas',
      'Invitados ilimitados',
      'Todas las funciones premium',
      'Plantillas premium',
      'Soporte VIP 24/7'
    ],
    limites: {
      maxBodas: Infinity,
      maxInvitados: Infinity,
      featuresActivas: ['basicas', 'premium', 'vip']
    }
  }
};

module.exports = {
  stripe,
  PLANES
};