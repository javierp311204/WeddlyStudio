const express = require("express");
const router = express.Router();
const BodaConfig = require("../models/BodaConfig");
const autenticar = require('../middleware/auth');
const emailService = require('../services/emailService');
const { verificarLimiteInvitados } = require('../middleware/checkLimits');

// ============================================
// 🔓 RUTAS PÚBLICAS (SIN AUTENTICACIÓN)
// ============================================

// GET: Configuración de papelería (PÚBLICA)
router.get("/configuracion-boda/:codigo", async (req, res) => {
  console.log("=== GET /configuracion-boda (PÚBLICA) ===");
  console.log("Código:", req.params.codigo);
  
  try {
    const boda = await BodaConfig.findOne({ codigoBoda: req.params.codigo });
    
    if (!boda) {
      console.log("❌ Boda no encontrada");
      return res.status(404).json({ error: "Boda no encontrada" });
    }

    const respuesta = {
      nombreNovia: boda.papeleria?.nombreNovia || '',
      nombreNovio: boda.papeleria?.nombreNovio || '',
      fecha: boda.papeleria?.fecha || boda.fechaHora || '',
      colorFondo: boda.papeleria?.colorFondo || '#ffffff',
      colorTexto: boda.papeleria?.colorTexto || '#d4a373',
      textoExtra: boda.papeleria?.textoExtra || '',
      plantilla: boda.papeleria?.plantilla || 'clasica',
      imagenFondo: boda.papeleria?.imagenFondo || null
    };

    console.log("✅ Configuración enviada");
    res.json(respuesta);
    
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Error al cargar configuración" });
  }
});

// POST: Guardar configuración de papelería (PÚBLICA)
router.post("/configuracion-boda", async (req, res) => {
  console.log("=== POST /configuracion-boda (PÚBLICA) ===");
  console.log("Body:", req.body);
  
  try {
    const { codigoBoda, ...datosPapeleria } = req.body;

    if (!codigoBoda) {
      return res.status(400).json({ error: "Código de boda requerido" });
    }

    const bodaActualizada = await BodaConfig.findOneAndUpdate(
      { codigoBoda },
      { 
        $set: { 
          papeleria: datosPapeleria
        }
      },
      { 
        new: true,
        upsert: true 
      }
    );

    console.log("✅ Configuración guardada");
    res.json({ 
      mensaje: "Configuración guardada correctamente",
      papeleria: bodaActualizada.papeleria
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ 
      error: "Error al guardar configuración", 
      detalle: error.message 
    });
  }
});

// ============================================
// 🔒 RUTAS PROTEGIDAS (CON AUTENTICACIÓN)
// ============================================

// --- MESAS ---
router.get("/mesas", autenticar, async (req, res) => {
  try {
    const { codigoBoda } = req.query;
    const boda = await BodaConfig.findOne({ codigoBoda });

    if (!boda) return res.status(404).json({ error: "Boda no encontrada" });

    res.json(boda.mesas || []);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener mesas" });
  }
});

router.post("/mesas", autenticar, async (req, res) => {
  console.log("=== POST /mesas recibida ===");
  console.log("Body:", req.body);
  
  try {
    const { codigoBoda, nombre, tipo, capacidad, posicion } = req.body;
    
    console.log("Buscando boda con código:", codigoBoda);
    
    const posicionInicial = {
      x: (posicion && posicion.x !== undefined) ? posicion.x : 50,
      y: (posicion && posicion.y !== undefined) ? posicion.y : 50
    };

    const asientosVacios = [];
    const capacidadMesa = capacidad || 8;
    for (let i = 0; i < capacidadMesa; i++) {
      asientosVacios.push({
        posicion: i,
        ocupado: false,
        invitado_id: null
      });
    }
    
    const bodaActualizada = await BodaConfig.findOneAndUpdate(
      { codigoBoda: codigoBoda }, 
      { 
        $push: { 
          mesas: { 
            nombre, 
            tipo, 
            capacidad: capacidadMesa,
            posicion: posicionInicial,
            radio: 60,
            asientos: asientosVacios
          } 
        },
        $setOnInsert: {
          lugarNombre: "",
          direccion: "",
          googleMapsLink: "",
          fechaHora: "",
          dressCode: "",
          menuResumen: "",
          invitados: []
        }
      },
      { 
        new: true,
        upsert: true
      }
    );
    
    console.log("✅ Mesa agregada con asientos vacíos");
    res.json(bodaActualizada.mesas);
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Error al guardar la mesa", detalle: error.message });
  }
});

router.delete("/mesas/:id", autenticar, async (req, res) => {
  console.log("=== DELETE /mesas/:id recibida ===");
  
  try {
    const { codigoBoda } = req.query;
    const mesaId = req.params.id;

    const boda = await BodaConfig.findOne({ codigoBoda });
    if (!boda) {
      return res.status(404).json({ error: "Boda no encontrada" });
    }

    const mesa = boda.mesas.id(mesaId);
    if (!mesa) {
      return res.status(404).json({ error: "Mesa no encontrada" });
    }

    const nombreMesa = mesa.nombre;
    
    await BodaConfig.updateOne(
      { codigoBoda },
      { 
        $set: { 
          "invitados.$[elem].mesa": "" 
        } 
      },
      { 
        arrayFilters: [{ "elem.mesa": nombreMesa }] 
      }
    );

    const bodaActualizada = await BodaConfig.findOneAndUpdate(
      { codigoBoda },
      { 
        $pull: { 
          mesas: { _id: mesaId }
        } 
      },
      { new: true }
    );

    console.log("✅ Mesa eliminada y invitados liberados");
    res.json({ 
      mensaje: "Mesa eliminada correctamente", 
      mesas: bodaActualizada.mesas 
    });
  } catch (error) {
    console.error("❌ Error al eliminar mesa:", error);
    res.status(500).json({ error: "Error al eliminar la mesa" });
  }
});

// --- INVITADOS ---
router.get("/invitados", autenticar, async (req, res) => {
  try {
    const { codigoBoda, busqueda, tipo } = req.query;

    const boda = await BodaConfig.findOne({ codigoBoda });

    if (!boda) {
      return res.status(404).json({ error: "Boda no encontrada" });
    }

    let listaInvitados = boda.invitados || [];

    if (busqueda) {
      const regex = new RegExp(busqueda, "i");
      listaInvitados = listaInvitados.filter(inv => regex.test(inv.nombre));
    }

    if (tipo && tipo !== 'Todos') {
      listaInvitados = listaInvitados.filter(inv => inv.tipo === tipo);
    }

    listaInvitados.sort((a, b) => a.nombre.localeCompare(b.nombre));

    res.json(listaInvitados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener la lista de invitados" });
  }
});

router.post("/invitados", autenticar, async (req, res) => {
  console.log("=== POST /invitados recibida ===");
  
  try {
    const { codigoBoda, nombre, email, tipo, menu, mesa } = req.body;

    const bodaActualizada = await BodaConfig.findOneAndUpdate(
      { codigoBoda }, 
      { 
        $push: { 
          invitados: { 
            nombre, 
            email, 
            tipo, 
            menu, 
            mesa: mesa || "", 
            nick: "",
            alergias: "",
            confirmado: false
          } 
        },
        $setOnInsert: {
          lugarNombre: "",
          direccion: "",
          googleMapsLink: "",
          fechaHora: "",
          dressCode: "",
          menuResumen: "",
          mesas: []
        }
      },
      { 
        new: true,
        upsert: true 
      }
    );

    console.log("✅ Invitado agregado");
    res.json(bodaActualizada.invitados);
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: 'Error al guardar invitado', detalle: error.message });
  }
});

router.put('/invitados/:id', autenticar, async (req, res) => {
    try {
        const { codigoBoda, mesa } = req.body;
        const invitadoId = req.params.id;

        const boda = await BodaConfig.findOne({ codigoBoda });
        if (!boda) {
            return res.status(404).json({ error: "Boda no encontrada" });
        }

        const invitado = boda.invitados.id(invitadoId);
        if (!invitado) {
            return res.status(404).json({ error: "Invitado no encontrado" });
        }

        const mesaAnterior = invitado.mesa;

        if (mesaAnterior && mesaAnterior !== "") {
            const mesaViejaObj = boda.mesas.find(m => m.nombre === mesaAnterior);
            if (mesaViejaObj) {
                const asientoOcupado = mesaViejaObj.asientos.find(
                    a => a.invitado_id && a.invitado_id.toString() === invitadoId
                );
                if (asientoOcupado) {
                    asientoOcupado.ocupado = false;
                    asientoOcupado.invitado_id = null;
                }
            }
        }

        invitado.mesa = mesa || "";

        if (mesa && mesa !== "") {
            const mesaNuevaObj = boda.mesas.find(m => m.nombre === mesa);
            if (mesaNuevaObj) {
                const asientoLibre = mesaNuevaObj.asientos.find(a => !a.ocupado);
                if (asientoLibre) {
                    asientoLibre.ocupado = true;
                    asientoLibre.invitado_id = invitadoId;
                }
            }
        }

        await boda.save();
        res.json(invitado);
        
    } catch (error) {
        console.error("❌ Error al actualizar invitado:", error);
        res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
    }
});

router.delete("/invitados/:id", autenticar, async (req, res) => {
  try {
    const { codigoBoda } = req.query;
    const invitadoId = req.params.id;

    const boda = await BodaConfig.findOne({ codigoBoda });
    if (!boda) {
      return res.status(404).json({ error: "Boda no encontrada" });
    }

    for (let mesa of boda.mesas) {
      const asiento = mesa.asientos.find(
        a => a.invitado_id && a.invitado_id.toString() === invitadoId
      );
      if (asiento) {
        asiento.ocupado = false;
        asiento.invitado_id = null;
      }
    }

    boda.invitados.pull(invitadoId);
    await boda.save();

    console.log("✅ Invitado eliminado y asiento liberado");
    res.json({ 
      mensaje: "Invitado eliminado correctamente", 
      invitados: boda.invitados 
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Error al eliminar el invitado" });
  }
});

// --- CONFIGURACIÓN BODA ---
router.get("/detalles/:codigo", autenticar, async (req, res) => {
  try {
    const config = await BodaConfig.findOne({ codigoBoda: req.params.codigo });
    if (!config) return res.status(404).json({ error: "Boda no encontrada en DB" });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

router.post("/detalles", autenticar, async (req, res) => {
  try {
    const { codigoBoda } = req.body;
    const Notificacion = require('../models/Notificacion');

    const configActualizada = await BodaConfig.findOneAndUpdate(
      { codigoBoda },
      req.body,
      { new: true, upsert: true }
    );

    const invitadosConNick = configActualizada.invitados.filter(inv => inv.nick && inv.nick !== "");

    if (invitadosConNick.length > 0) {
      const notificaciones = invitadosConNick.map(inv => ({
        usuarioDestino: inv.nick,
        tipoUsuario: 'invitado',
        codigoBoda: codigoBoda,
        titulo: '✨ ¡Novedades en la Boda!',
        mensaje: 'El administrador ha actualizado la información del evento. ¡Echa un vistazo!',
        tipo: 'info-boda',
        ruta: '/info-boda',
        leida: false
      }));

      await Notificacion.insertMany(notificaciones);
      console.log(`✅ ${notificaciones.length} notificaciones creadas`);
    }

    res.json({ 
      mensaje: "Configuración guardada y avisos enviados", 
      data: configActualizada,
      notificacionesEnviadas: invitadosConNick.length
    });

  } catch (error) {
    console.error("❌ Error al guardar:", error);
    res.status(500).json({ error: "Error al procesar la configuración" });
  }
});

// ============================================
// 📧 ENVÍO DE INVITACIONES (PÚBLICAS)
// ============================================

router.post("/enviar-invitacion-individual", async (req, res) => {
  console.log("=== POST /enviar-invitacion-individual ===");
  
  try {
    const { email, nombre, datosInvitacion, pdfBase64 } = req.body;

    if (!email || !datosInvitacion) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    let pdfBuffer = null;
    if (pdfBase64) {
      const base64Data = pdfBase64.replace(/^data:application\/pdf;[^,]+,/, '');
      pdfBuffer = Buffer.from(base64Data, 'base64');
    }

    const datos = {
      ...datosInvitacion,
      nombreInvitado: nombre
    };

    const resultado = await emailService.enviarInvitacion(email, datos, pdfBuffer);

    if (resultado.success) {
      res.json({ 
        mensaje: "Invitación enviada correctamente",
        messageId: resultado.messageId 
      });
    } else {
      res.status(500).json({ 
        error: "Error al enviar el email",
        detalle: resultado.error 
      });
    }

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Error al procesar la solicitud" });
  }
});

router.post("/enviar-invitaciones-masivas", async (req, res) => {
  console.log("=== POST /enviar-invitaciones-masivas ===");
  
  try {
    const { codigoBoda, pdfBase64, datosInvitacion } = req.body;

    if (!codigoBoda || !datosInvitacion) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const boda = await BodaConfig.findOne({ codigoBoda });
    if (!boda) {
      return res.status(404).json({ error: "Boda no encontrada" });
    }

    const invitadosConEmail = boda.invitados.filter(
      inv => inv.email && inv.email.includes('@')
    );

    if (invitadosConEmail.length === 0) {
      return res.status(400).json({ 
        error: "No hay invitados con email válido" 
      });
    }

    let pdfBuffer = null;
    if (pdfBase64) {
      const base64Data = pdfBase64.replace(/^data:application\/pdf;[^,]+,/, '');
      pdfBuffer = Buffer.from(base64Data, 'base64');
    }

    const resultados = await emailService.enviarInvitacionMasiva(
      invitadosConEmail,
      datosInvitacion,
      pdfBuffer
    );

    const exitosos = resultados.filter(r => r.success).length;
    const fallidos = resultados.filter(r => !r.success).length;

    console.log(`✅ Enviados: ${exitosos} | ❌ Fallidos: ${fallidos}`);

    res.json({
      mensaje: "Proceso de envío completado",
      total: resultados.length,
      exitosos,
      fallidos,
      detalles: resultados
    });

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Error al procesar el envío masivo" });
  }
});

module.exports = router;