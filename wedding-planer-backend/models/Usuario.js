const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  pass: { type: String, required: true },
  rol: { type: String, default: 'invitado' },
  codigoBoda: String,
  nick: String,

  emailVerificado: { type: Boolean, default: false },
  tokenVerificacion: { type: String },
  tokenExpiracion: { type: Date },
  plan: { 
    type: String, 
    enum: ['free', 'one_time', 'unlimited'], 
    default: 'free' 
  },
  stripeCustomerId: { type: String }, // ID del cliente en Stripe
  stripeSubscriptionId: { type: String }, // ID de la suscripción activa
  stripePriceId: { type: String }, // ID del precio/plan actual
  subscriptionStatus: { 
    type: String, 
    enum: ['active', 'canceled', 'past_due', 'inactive'],
    default: 'inactive'
  },
  subscriptionEndDate: { type: Date }, // Fecha de fin de suscripción
  paymentHistory: [
    {
      fecha: { type: Date, default: Date.now },
      monto: Number,
      plan: String,
      stripePaymentId: String,
      tipo: { type: String, enum: ['one_time', 'subscription'] }
    }
  ],
  
  // Límites según plan
  limites: {
    maxBodas: { type: Number, default: 1 }, // Free: 1, One-time: 1, Unlimited: ∞
    maxInvitados: { type: Number, default: 50 }, // Free: 50, One-time: 300, Unlimited: ∞
    featuresActivas: { type: [String], default: ['basicas'] } // ['basicas', 'premium', 'vip']
  }
}, {
  timestamps: true 
});

module.exports = mongoose.model("Usuario", UsuarioSchema);