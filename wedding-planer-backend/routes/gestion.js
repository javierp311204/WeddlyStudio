const express = require("express");
const router = express.Router();
const Mesa = require("../models/Mesa");
const Usuario = require("../models/Usuario");
const Invitado = require("../models/Invitado");
const Notificacion = require("../models/Notificacion");
const BodaConfig = require("../models/BodaConfig");
const autenticar = require('../middleware/auth');



// --- MESAS ---
router.get("/mesas", async (req, res) => {
  try {
    const { codigoBoda } = req.query;
    const boda = await BodaConfig.findOne({ codigoBoda });

    if (!boda) return res.status(404).json({ error: "Boda no encontrada" });

    // Si no tienes el array de mesas aún, devolvemos uno vacío
    res.json(boda.mesas || []);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener mesas" });
  }
});


// POST: Agregar una mesa al array de la boda
router.post("/mesas", async (req, res) => {
  console.log("=== POST /mesas recibida ===");
  console.log("Body:", req.body);
  console.log("Usuario autenticado:", req.usuarioData);
  
  try {
    const { codigoBoda, nombre, tipo, capacidad } = req.body;
    
    console.log("Buscando boda con código:", codigoBoda);
    
    // Buscar o crear la boda si no existe (upsert)
    const bodaActualizada = await BodaConfig.findOneAndUpdate(
      { codigoBoda: codigoBoda }, 
      { 
        $push: { mesas: { nombre, tipo, capacidad } },
        $setOnInsert: { // Estos campos solo se establecen si se crea un nuevo documento
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
        new: true,      // Devuelve el documento actualizado
        upsert: true    // Crea el documento si no existe
      }
    );
    
    console.log("✅ Mesa agregada/creada exitosamente");
    res.json(bodaActualizada.mesas);
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Error al guardar la mesa", detalle: error.message });
  }
});

router.delete("/mesas/:id", async (req, res) => {
  console.log("=== DELETE /mesas/:id recibida ===");
  console.log("ID Mesa:", req.params.id);
  console.log("Query:", req.query);
  
  try {
    const { codigoBoda } = req.query;
    const mesaId = req.params.id;

    const bodaActualizada = await BodaConfig.findOneAndUpdate(
      { codigoBoda: codigoBoda },
      { 
        $pull: { 
          mesas: { _id: mesaId }
        } 
      },
      { new: true }
    );

    if (!bodaActualizada) {
      return res.status(404).json({ error: "No se encontró la boda o la mesa" });
    }

    console.log("✅ Mesa eliminada correctamente");
    res.json({ mensaje: "Mesa eliminada correctamente", mesas: bodaActualizada.mesas });
  } catch (error) {
    console.error("❌ Error al eliminar mesa:", error);
    res.status(500).json({ error: "Error al eliminar la mesa" });
  }
});

// --- INVITADOS ---
// GET: Obtener y filtrar invitados desde el array de BodaConfig
router.get("/invitados", async (req, res) => {
  try {
    const { codigoBoda, busqueda, tipo } = req.query;

    // Buscamos el documento de la boda específica
    const boda = await BodaConfig.findOne({ codigoBoda: codigoBoda });

    if (!boda) {
      return res.status(404).json({ error: "Boda no encontrada" });
    }

    // Extraemos el array de invitados
    let listaInvitados = boda.invitados || [];

    // Aplicamos los filtros manualmente sobre el array (JavaScript)
    if (busqueda) {
      const regex = new RegExp(busqueda, "i");
      listaInvitados = listaInvitados.filter(inv => regex.test(inv.nombre));
    }

    if (tipo && tipo !== 'Todos') {
      listaInvitados = listaInvitados.filter(inv => inv.tipo === tipo);
    }

    // Ordenamos por nombre
    listaInvitados.sort((a, b) => a.nombre.localeCompare(b.nombre));

    res.json(listaInvitados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener la lista de invitados" });
  }
});

// POST: Agregar un invitado al array dentro de BodaConfig

router.post("/invitados", async (req, res) => {
  console.log("=== POST /invitados recibida ===");
  console.log("Body:", req.body);
  
  try {
    const { codigoBoda, nombre, email, tipo, menu, mesa } = req.body;

    const bodaActualizada = await BodaConfig.findOneAndUpdate(
      { codigoBoda: codigoBoda }, 
      { 
        $push: { 
          invitados: { nombre, email, tipo, menu, mesa, nick: "" } 
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

    console.log("✅ Invitado agregado/creado exitosamente");
    res.json(bodaActualizada.invitados);
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: 'Error al guardar invitado', detalle: error.message });
  }
});

router.put('/invitados/:id', async (req, res) => {
    console.log("=== PUT /invitados/:id recibida ===");
    console.log("ID:", req.params.id);
    console.log("Body:", req.body);
    
    try {
        const { codigoBoda, mesa } = req.body;
        const invitadoId = req.params.id;

        // Actualiza el invitado específico dentro del array usando el operador posicional $
        const bodaActualizada = await BodaConfig.findOneAndUpdate(
            { 
                codigoBoda: codigoBoda,
                "invitados._id": invitadoId  // Encuentra el invitado específico
            },
            { 
                $set: { 
                    "invitados.$.mesa": mesa  // Actualiza solo el campo mesa del invitado encontrado
                } 
            },
            { new: true }
        );

        if (!bodaActualizada) {
            console.log("❌ No se encontró la boda o el invitado");
            return res.status(404).json({ error: "Invitado o boda no encontrada" });
        }

        // Buscar el invitado actualizado para devolverlo
        const invitadoActualizado = bodaActualizada.invitados.find(
            inv => inv._id.toString() === invitadoId
        );

        console.log(`✅ Mesa actualizada para invitado:`, invitadoActualizado);
        res.json(invitadoActualizado);
        
    } catch (error) {
        console.error("❌ Error al actualizar invitado:", error);
        res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
    }
});

// DELETE: Eliminar un invitado del array por su _id único
router.delete("/invitados/:id", async (req, res) => {
  try {
    const { codigoBoda } = req.query; // Pasamos el código por query string para localizar la boda

    const bodaActualizada = await BodaConfig.findOneAndUpdate(
      { codigoBoda: codigoBoda },
      { 
        $pull: { 
          invitados: { _id: req.params.id } // El operador $pull saca el objeto del array
        } 
      },
      { new: true }
    );

    if (!bodaActualizada) {
      return res.status(404).json({ error: "No se encontró la boda o el invitado" });
    }

    res.json({ mensaje: "Invitado eliminado correctamente", invitados: bodaActualizada.invitados });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar el invitado" });
  }
});

// --- CONFIGURACIÓN BODA ---
router.get("/detalles/:codigo", async (req, res) => {
  try {
    const config = await BodaConfig.findOne({ codigoBoda: req.params.codigo });
    if (!config) return res.status(404).json({ error: "Boda no encontrada en DB" });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Guardar o actualizar configuración
router.post("/detalles", async (req, res) => {
  try {
    const { codigoBoda } = req.body;

    const configActualizada = await BodaConfig.findOneAndUpdate(
      { codigoBoda },
      req.body,
      { new: true, upsert: true }
    );

    const invitados = await Usuario.find({ 
      codigoBoda: codigoBoda, 
      rol: 'invitado' 
    });

    if (invitados.length > 0) {
      const promesasNotifs = invitados.map(inv => {
        return new Notificacion({
          usuarioDestino: inv.nick, 
          codigoBoda: codigoBoda,
          titulo: '✨ ¡Novedades en la Boda!',
          mensaje: 'El administrador ha actualizado la información del evento. ¡Echa un vistazo!',
          tipo: 'info',
          leida: false
        }).save();
      });

      await Promise.all(promesasNotifs);
    }

    res.json({ 
      mensaje: "Configuración guardada y avisos enviados", 
      data: configActualizada 
    });

  } catch (error) {
    console.error("❌ Error al guardar y notificar:", error);
    res.status(500).json({ error: "Error al procesar la configuración" });
  }
});

module.exports = router;