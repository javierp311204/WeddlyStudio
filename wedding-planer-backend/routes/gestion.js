const express = require("express");
const router = express.Router();
const BodaConfig = require("../models/BodaConfig");
const autenticar = require('../middleware/auth');

// --- MESAS ---
router.get("/mesas", async (req, res) => {
  try {
    const { codigoBoda } = req.query;
    const boda = await BodaConfig.findOne({ codigoBoda });

    if (!boda) return res.status(404).json({ error: "Boda no encontrada" });

    res.json(boda.mesas || []);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener mesas" });
  }
});

// POST: Agregar mesa (SINCRONIZADO con plano)
router.post("/mesas", async (req, res) => {
  console.log("=== POST /mesas recibida ===");
  console.log("Body:", req.body);
  
  try {
    const { codigoBoda, nombre, tipo, capacidad, posicion } = req.body;
    
    console.log("Buscando boda con código:", codigoBoda);
    
    // Posición inicial (centro si no se especifica)
    const posicionInicial = {
      x: (posicion && posicion.x !== undefined) ? posicion.x : 50,
      y: (posicion && posicion.y !== undefined) ? posicion.y : 50
    };

    // ✅ CREAR ASIENTOS VACÍOS (para que funcione el plano)
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
            asientos: asientosVacios // ⬅️ CRÍTICO para el plano
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

// DELETE: Eliminar mesa (SINCRONIZADO)
router.delete("/mesas/:id", async (req, res) => {
  console.log("=== DELETE /mesas/:id recibida ===");
  console.log("ID Mesa:", req.params.id);
  
  try {
    const { codigoBoda } = req.query;
    const mesaId = req.params.id;

    // Buscar la mesa antes de eliminarla
    const boda = await BodaConfig.findOne({ codigoBoda });
    if (!boda) {
      return res.status(404).json({ error: "Boda no encontrada" });
    }

    const mesa = boda.mesas.id(mesaId);
    if (!mesa) {
      return res.status(404).json({ error: "Mesa no encontrada" });
    }

    // ✅ LIBERAR INVITADOS que estaban en esta mesa (sincronización)
    const nombreMesa = mesa.nombre;
    
    // Actualizar invitados que tenían esta mesa asignada
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

    // Eliminar la mesa
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
router.get("/invitados", async (req, res) => {
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

router.post("/invitados", async (req, res) => {
  console.log("=== POST /invitados recibida ===");
  console.log("Body:", req.body);
  
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

// PUT: Actualizar invitado (SINCRONIZADO con asientos del plano)
router.put('/invitados/:id', async (req, res) => {
    console.log("=== PUT /invitados/:id recibida ===");
    console.log("ID:", req.params.id);
    console.log("Body:", req.body);
    
    try {
        const { codigoBoda, mesa } = req.body;
        const invitadoId = req.params.id;

        const boda = await BodaConfig.findOne({ codigoBoda });
        if (!boda) {
            return res.status(404).json({ error: "Boda no encontrada" });
        }

        // Buscar el invitado
        const invitado = boda.invitados.id(invitadoId);
        if (!invitado) {
            return res.status(404).json({ error: "Invitado no encontrado" });
        }

        const mesaAnterior = invitado.mesa;

        // ✅ SINCRONIZACIÓN CON ASIENTOS

        // 1. Si tenía mesa anterior, liberar ese asiento
        if (mesaAnterior && mesaAnterior !== "") {
            const mesaViejaObj = boda.mesas.find(m => m.nombre === mesaAnterior);
            if (mesaViejaObj) {
                const asientoOcupado = mesaViejaObj.asientos.find(
                    a => a.invitado_id && a.invitado_id.toString() === invitadoId
                );
                if (asientoOcupado) {
                    asientoOcupado.ocupado = false;
                    asientoOcupado.invitado_id = null;
                    console.log(`🔄 Liberado asiento en ${mesaAnterior}`);
                }
            }
        }

        // 2. Actualizar el campo mesa del invitado
        invitado.mesa = mesa || "";

        // 3. Si la nueva mesa existe, ocupar un asiento
        if (mesa && mesa !== "") {
            const mesaNuevaObj = boda.mesas.find(m => m.nombre === mesa);
            if (mesaNuevaObj) {
                // Buscar primer asiento vacío
                const asientoLibre = mesaNuevaObj.asientos.find(a => !a.ocupado);
                if (asientoLibre) {
                    asientoLibre.ocupado = true;
                    asientoLibre.invitado_id = invitadoId;
                    console.log(`✅ Invitado asignado a asiento en ${mesa}`);
                } else {
                    console.log(`⚠️ Mesa ${mesa} llena, pero se actualizó el campo mesa del invitado`);
                }
            }
        }

        await boda.save();

        console.log(`✅ Invitado actualizado y sincronizado`);
        res.json(invitado);
        
    } catch (error) {
        console.error("❌ Error al actualizar invitado:", error);
        res.status(500).json({ error: "Error interno del servidor", detalle: error.message });
    }
});

router.delete("/invitados/:id", async (req, res) => {
  try {
    const { codigoBoda } = req.query;
    const invitadoId = req.params.id;

    const boda = await BodaConfig.findOne({ codigoBoda });
    if (!boda) {
      return res.status(404).json({ error: "Boda no encontrada" });
    }

    // ✅ LIBERAR ASIENTO si estaba ocupado
    for (let mesa of boda.mesas) {
      const asiento = mesa.asientos.find(
        a => a.invitado_id && a.invitado_id.toString() === invitadoId
      );
      if (asiento) {
        asiento.ocupado = false;
        asiento.invitado_id = null;
        console.log(`🔄 Asiento liberado en ${mesa.nombre}`);
      }
    }

    // Eliminar invitado
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
router.get("/detalles/:codigo", async (req, res) => {
  try {
    const config = await BodaConfig.findOne({ codigoBoda: req.params.codigo });
    if (!config) return res.status(404).json({ error: "Boda no encontrada en DB" });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

router.post("/detalles", async (req, res) => {
  try {
    const { codigoBoda } = req.body;

    const configActualizada = await BodaConfig.findOneAndUpdate(
      { codigoBoda },
      req.body,
      { new: true, upsert: true }
    );

    res.json({ 
      mensaje: "Configuración guardada", 
      data: configActualizada 
    });

  } catch (error) {
    console.error("❌ Error al guardar:", error);
    res.status(500).json({ error: "Error al procesar la configuración" });
  }
});

module.exports = router;