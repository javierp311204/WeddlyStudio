const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const auth = require('../middleware/auth');
const Notificacion = require('../models/Notificacion');

const upload = multer({ dest: 'uploads/' });

// Define el esquema directamente aquí si hay problemas con el modelo
const AlbumSchema = new mongoose.Schema({
    codigoBoda: { type: String, required: true, unique: true },
    fotos: [{
        url: String,
        usuario: String,
        fecha: { type: Date, default: Date.now }
    }]
}, { collection: 'albumes_digitales' });

// Usa mongoose.models para evitar errores de recompilación
const Album = mongoose.models.Album || mongoose.model('Album', AlbumSchema);

// Ruta de prueba
router.get('/test', (req, res) => {
    res.json({ mensaje: "Test funcionando" });
});

// Ruta para subir fotos
router.post('/subir', auth, upload.single('imagen'), async (req, res) => {
    console.log("=== POST /subir ===");
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se recibió la imagen" });
        }

        const { codigoBoda, usuario } = req.body;
        const url = `http://localhost:3000/uploads/${req.file.filename}`;

        const resultado = await Album.findOneAndUpdate(
            { codigoBoda },
            { $push: { fotos: { url, usuario } } },
            { upsert: true, new: true }
        );

        const adminReal = await Usuario.findOne({ 
            codigoBoda: codigoBoda, 
            rol: 'admin' 
        });

        if (adminReal) {
            const nuevaNotif = new Notificacion({
                usuarioDestino: adminReal.nick, 
                codigoBoda: codigoBoda,
                titulo: '📷 ¡Nueva foto!',
                mensaje: `${usuario || 'Un invitado'} ha subido una foto al álbum.`,
                tipo: 'foto',
                leida: false
            });

            await nuevaNotif.save();
            console.log(`✅ Notificación enviada al admin: ${adminReal.nick}`);
        } else {
            console.log("⚠️ No se encontró un usuario con rol 'admin' para esta boda.");
        }

        res.json(resultado);

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Ruta para obtener fotos
router.get('/:codigoBoda', auth, async (req, res) => {
    try {
        const album = await Album.findOne({ codigoBoda: req.params.codigoBoda });
        res.json(album || { fotos: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;