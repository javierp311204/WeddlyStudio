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
        return asiento;
      });

      return {
        ...mesa.toObject(),
        asientos: asientosConDatos
      };
    });

    res.json({
      finca: boda.finca,
      mesas: mesasConInvitados,
      invitados: boda.invitados // Lista completa para el panel lateral
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

    console.log('📥 RECIBIENDO coordenadas:', { x, y });

    // Validación de seguridad para no guardar valores nulos o fuera de rango
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

// 3. ASIGNAR INVITADO A ASIENTO
router.post("/mesa/:mesaId/asiento", auth, async (req, res) => {
  try {
    const { codigoBoda, invitadoId, posicion } = req.body;
    const { mesaId } = req.params;

    const boda = await BodaConfig.findOne({ codigoBoda });
    if (!boda) return res.status(404).json({ error: "Boda no encontrada" });

    const mesa = boda.mesas.id(mesaId);
    if (!mesa) return res.status(404).json({ error: "Mesa no encontrada" });

    // Verificar capacidad
    if (mesa.asientos.filter(a => a.ocupado).length >= mesa.capacidad) {
      return res.status(400).json({ error: "La mesa ya ha alcanzado su capacidad máxima" });
    }

    // Agregar el nuevo asiento ocupado
    mesa.asientos.push({
      posicion: posicion,
      invitado_id: invitadoId,
      ocupado: true
    });

    await boda.save();
    res.json({ mensaje: "Invitado asignado con éxito", mesa });

  } catch (error) {
    console.error("Error al sentar invitado:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// 4. CREAR NUEVA MESA
router.post("/nueva-mesa", auth, async (req, res) => {
  try {
    const { codigoBoda, nombre, tipo, capacidad, posicion } = req.body;

    // Forzamos el centro si no se envían coordenadas
    const posicionInicial = {
      x: (posicion && posicion.x !== undefined) ? posicion.x : 50,
      y: (posicion && posicion.y !== undefined) ? posicion.y : 50
    };

    const boda = await BodaConfig.findOneAndUpdate(
      { codigoBoda: codigoBoda },
      { 
        $push: { 
          mesas: { 
            nombre, 
            tipo, 
            capacidad: capacidad || 8,
            posicion: posicionInicial, // Evita el 0,0 por defecto
            radio: 60,
            asientos: [] 
          } 
        } 
      },
      { new: true }
    );

    if (!boda) return res.status(404).json({ error: "Boda no encontrada" });

    // Devolvemos la última mesa creada
    const nuevaMesa = boda.mesas[boda.mesas.length - 1];
    res.json({ mensaje: "Mesa creada en el centro", mesa: nuevaMesa });

  } catch (error) {
    console.error("Error al crear mesa:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});

module.exports = router;