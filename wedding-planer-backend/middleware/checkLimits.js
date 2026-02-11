const Usuario = require('../models/Usuario');
const BodaConfig = require('../models/BodaConfig');

// Middleware para verificar si el usuario puede crear más bodas
async function verificarLimiteBodas(req, res, next) {
  try {
    const usuario = await Usuario.findById(req.usuarioData.id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const bodasActivas = await BodaConfig.countDocuments({ 
      adminEmail: usuario.email 
    });

    const maxBodas = usuario.limites.maxBodas;

    // Si el límite es Infinity (plan unlimited), siempre puede crear
    if (maxBodas === Infinity || bodasActivas < maxBodas) {
      return next();
    }

    // Límite alcanzado
    return res.status(403).json({ 
      error: 'Límite de bodas alcanzado',
      mensaje: `Tu plan ${usuario.plan} permite máximo ${maxBodas} boda(s). Actualiza tu plan para crear más.`,
      planActual: usuario.plan,
      limiteAlcanzado: true,
      detalles: {
        bodasActivas,
        maxBodas,
        planRecomendado: 'unlimited'
      }
    });
  } catch (error) {
    console.error('Error verificando límite de bodas:', error);
    res.status(500).json({ error: 'Error al verificar límites' });
  }
}

// Middleware para verificar si puede agregar más invitados
async function verificarLimiteInvitados(req, res, next) {
  try {
    const usuario = await Usuario.findById(req.usuarioData.id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const codigoBoda = req.usuarioData.codigoBoda || req.body.codigoBoda;
    const boda = await BodaConfig.findOne({ codigoBoda });

    if (!boda) {
      return res.status(404).json({ error: 'Boda no encontrada' });
    }

    const invitadosActuales = boda.invitados.length;
    const maxInvitados = usuario.limites.maxInvitados;

    // Si el límite es Infinity, siempre puede agregar
    if (maxInvitados === Infinity || invitadosActuales < maxInvitados) {
      return next();
    }

    // Límite alcanzado
    return res.status(403).json({ 
      error: 'Límite de invitados alcanzado',
      mensaje: `Tu plan ${usuario.plan} permite máximo ${maxInvitados} invitados. Actualiza tu plan para agregar más.`,
      planActual: usuario.plan,
      limiteAlcanzado: true,
      detalles: {
        invitadosActuales,
        maxInvitados,
        planRecomendado: usuario.plan === 'free' ? 'one_time' : 'unlimited'
      }
    });
  } catch (error) {
    console.error('Error verificando límite de invitados:', error);
    res.status(500).json({ error: 'Error al verificar límites' });
  }
}

// Middleware para verificar si tiene acceso a features premium
function verificarFeaturePremium(featureRequerida) {
  return async (req, res, next) => {
    try {
      const usuario = await Usuario.findById(req.usuarioData.id);

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const tieneAcceso = usuario.limites.featuresActivas.includes(featureRequerida);

      if (tieneAcceso) {
        return next();
      }

      // No tiene acceso
      return res.status(403).json({ 
        error: 'Función premium',
        mensaje: `Esta función requiere un plan premium. Actualiza tu plan para acceder.`,
        planActual: usuario.plan,
        featureRequerida,
        featuresBloqueada: true,
        planRecomendado: 'one_time'
      });
    } catch (error) {
      console.error('Error verificando feature premium:', error);
      res.status(500).json({ error: 'Error al verificar acceso' });
    }
  };
}

module.exports = {
  verificarLimiteBodas,
  verificarLimiteInvitados,
  verificarFeaturePremium
};