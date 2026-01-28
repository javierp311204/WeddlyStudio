const jwt = require("jsonwebtoken");
const SECRET_KEY = "tu_clave_secreta_boda_2024";

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No tienes permiso (Falta Token)" });
  }

  const token = authHeader.split(" ")[1]; // Extrae el token del "Bearer TOKEN"

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.usuarioData = decoded; // Guardamos los datos del usuario en la petición
    next(); // ¡Adelante, puedes pasar!
  } catch (error) {
    res.status(403).json({ error: "Token inválido o expirado" });
  }
};