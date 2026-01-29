const express = require("express");
const router = express.Router();
const BodaConfig = require("../models/BodaConfig");
const auth = require('../middleware/auth');

// 1. OBTENER PLANO COMPLETO
router.get("/:codigoBoda", auth, async (req, res) => {
  try {
    const boda = await BodaConfig.findOne({ codigoBoda: req.params.codigoBoda });
    
    if (!boda) {
      return res.status(404).json({ error: "Boda no encontrada" });
    }

    // Mapear mesas para incluir datos detallados de invitados en los asientos
    const mesasConInvitados = boda.mesas.map(mesa => {
      const asientosConDatos = mesa.asientos.map(asiento => {
        if (asiento.invitado_id) {
          const invitado = boda.invitados.id(asiento.invitado_id);
          return {
            ...asiento.toObject(),
            invitado: invitado ? {
              nombre: invitado.nombre,
              tipo: invitado.tipo,
              alergias: invitado.alergias,
              confirmado: invitado.confirmado
            } : null
          };
        }
        return asiento.toObject();
      });

      return {
        ...mesa.toObject(),
        asientos: asientosConDatos
      };
    });

    res.json({
      finca: boda.finca,
      mesas: mesasConInvitados,
      invitados: boda.invitados
    });

  } catch (error) {
    console.error("Error al obtener plano:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// 2. ACTUALIZAR POSICIÓN (DRAG & DROP)
router.patch("/mesa/:mesaId/posicion", auth, async (req, res) => {
  try {
    const { codigoBoda, x, y } = req.body;
    const { mesaId } = req.params;

    if (x === undefined || y === undefined || x < 0 || x > 100 || y < 0 || y > 100) {
      return res.status(400).json({ error: "Coordenadas inválidas (0-100)" });
    }

    const resultado = await BodaConfig.findOneAndUpdate(
      { 
        codigoBoda: codigoBoda,
        "mesas._id": mesaId 
      },
      { 
        $set: { 
          "mesas.$.posicion.x": x,
          "mesas.$.posicion.y": y
        } 
      },
      { new: true }
    );

    if (!resultado) {
      return res.status(404).json({ error: "Mesa no encontrada" });
    }

    res.json({ 
      mensaje: "Posición actualizada correctamente", 
      posicion: { x, y } 
    });

  } catch (error) {
    console.error("Error al actualizar posición:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// 3. ASIGNAR INVITADO A ASIENTO (usado desde el plano)
router.post("/asignar-invitado", auth, async (req, res) => {
  try {
    const { codigoBoda, mesaId, invitadoId } = req.body;

    const boda = await BodaConfig.findOne({ codigoBoda });
    if (!boda) return res.status(404).json({ error: "Boda no encontrada" });

    const mesa = boda.mesas.id(mesaId);
    if (!mesa) return res.status(404).json({ error: "Mesa no encontrada" });

    const invitado = boda.invitados.id(invitadoId);
    if (!invitado) return res.status(404).json({ error: "Invitado no encontrado" });

    // ✅ SINCRONIZACIÓN: Verificar si ya está sentado
    for (let m of boda.mesas) {
      const yaEstaAqui = m.asientos.some(a => 
        a.invitado_id && a.invitado_id.toString() === invitadoId
      );
      if (yaEstaAqui && m._id.toString() !== mesaId) {
        // Liberar asiento anterior
        const asientoViejo = m.asientos.find(
          a => a.invitado_id && a.invitado_id.toString() === invitadoId
        );
        if (asientoViejo) {
          asientoViejo.ocupado = false;
          asientoViejo.invitado_id = null;
        }
      }
    }

    // Buscar primer asiento vacío
    let asientoLibre = mesa.asientos.find(a => !a.ocupado);
    
    if (!asientoLibre) {
      return res.status(400).json({ 
        error: `La mesa ${mesa.nombre} está llena` 
      });
    }

    // Asignar el invitado al asiento
    asientoLibre.invitado_id = invitadoId;
    asientoLibre.ocupado = true;

    // ✅ SINCRONIZACIÓN: Actualizar campo "mesa" del invitado
    invitado.mesa = mesa.nombre;

    await boda.save();

    res.json({ 
      mensaje: "Invitado asignado correctamente",
      mesa: mesa.nombre,
      invitado: invitado.nombre
    });

  } catch (error) {
    console.error("Error al asignar invitado:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// 4. QUITAR INVITADO DE ASIENTO (usado desde el plano)
router.post("/quitar-invitado", auth, async (req, res) => {
  try {
    const { codigoBoda, mesaId, invitadoId } = req.body;

    const boda = await BodaConfig.findOne({ codigoBoda });
    if (!boda) return res.status(404).json({ error: "Boda no encontrada" });

    const mesa = boda.mesas.id(mesaId);
    if (!mesa) return res.status(404).json({ error: "Mesa no encontrada" });

    // Buscar el asiento ocupado por este invitado
    const asiento = mesa.asientos.find(
      a => a.invitado_id && a.invitado_id.toString() === invitadoId
    );

    if (!asiento) {
      return res.status(404).json({ error: "Asiento no encontrado" });
    }

    // Liberar el asiento
    asiento.ocupado = false;
    asiento.invitado_id = null;

    // ✅ SINCRONIZACIÓN: Limpiar campo "mesa" del invitado
    const invitado = boda.invitados.id(invitadoId);
    if (invitado) {
      invitado.mesa = "";
    }

    await boda.save();

    res.json({ 
      mensaje: "Invitado quitado de la mesa",
      mesa: mesa.nombre
    });

  } catch (error) {
    console.error("Error al quitar invitado:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// 5. CREAR NUEVA MESA (desde plano o gestión)
router.post("/nueva-mesa", auth, async (req, res) => {
  try {
    const { codigoBoda, nombre, tipo, capacidad, posicion } = req.body;

    const posicionInicial = {
      x: (posicion && posicion.x !== undefined) ? posicion.x : 50,
      y: (posicion && posicion.y !== undefined) ? posicion.y : 50
    };

    // ✅ CREAR ASIENTOS VACÍOS
    const asientosVacios = [];
    const capacidadMesa = capacidad || 8;
    for (let i = 0; i < capacidadMesa; i++) {
      asientosVacios.push({
        posicion: i,
        ocupado: false,
        invitado_id: null
      });
    }

    const boda = await BodaConfig.findOneAndUpdate(
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
        } 
      },
      { new: true }
    );

    if (!boda) return res.status(404).json({ error: "Boda no encontrada" });

    const nuevaMesa = boda.mesas[boda.mesas.length - 1];
    res.json({ mensaje: "Mesa creada con asientos", mesa: nuevaMesa });

  } catch (error) {
    console.error("Error al crear mesa:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// 6. ELIMINAR MESA (desde el plano)
router.delete("/mesa/:mesaId", auth, async (req, res) => {
  try {
    const { codigoBoda } = req.query;
    const { mesaId } = req.params;

    const boda = await BodaConfig.findOne({ codigoBoda });
    if (!boda) {
      return res.status(404).json({ error: "Boda no encontrada" });
    }

    const mesa = boda.mesas.id(mesaId);
    if (!mesa) {
      return res.status(404).json({ error: "Mesa no encontrada" });
    }

    // Verificar que no tenga invitados
    const tieneInvitados = mesa.asientos.some(a => a.ocupado);
    if (tieneInvitados) {
      return res.status(400).json({ 
        error: "La mesa tiene invitados asignados. Quítalos primero." 
      });
    }

    // ✅ SINCRONIZACIÓN: Liberar invitados por si acaso
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

    // Eliminar la mesa
    boda.mesas.pull(mesaId);
    await boda.save();

    res.json({ 
      mensaje: "Mesa eliminada correctamente",
      mesas: boda.mesas
    });

  } catch (error) {
    console.error("Error al eliminar mesa:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// 7. MIGRAR MESAS EXISTENTES (agregar asientos a mesas viejas)
router.post("/migrar-asientos", auth, async (req, res) => {
  try {
    const { codigoBoda } = req.body;

    const boda = await BodaConfig.findOne({ codigoBoda });
    if (!boda) return res.status(404).json({ error: "Boda no encontrada" });

    let mesasActualizadas = 0;

    for (let mesa of boda.mesas) {
      if (!mesa.asientos || mesa.asientos.length === 0) {
        mesa.asientos = [];
        for (let i = 0; i < mesa.capacidad; i++) {
          mesa.asientos.push({
            posicion: i,
            ocupado: false,
            invitado_id: null
          });
        }
        mesasActualizadas++;
      }
    }

    await boda.save();

    res.json({ 
      mensaje: `${mesasActualizadas} mesas actualizadas`,
      totalMesas: boda.mesas.length
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

module.exports = router;