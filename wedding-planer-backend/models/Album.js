const mongoose = require('mongoose');

const AlbumSchema = new mongoose.Schema({
    codigoBoda: { type: String, required: true, unique: true },
    fotos: [{
        url: String,
        usuario: String,
        fecha: { type: Date, default: Date.now }
    }]
}, { collection: 'albumes_digitales' });

module.exports = mongoose.model('Album', AlbumSchema);