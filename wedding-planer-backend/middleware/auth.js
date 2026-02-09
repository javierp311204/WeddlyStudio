const jwt = require("jsonwebtoken");
const SECRET_KEY = "tu_clave_secreta_boda_2024";

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No tienes permiso (Falta Token)" });
  }

  const token = authHeader.split(" ")[1]; 

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.usuarioData = decoded; 
    next(); 
  } catch (error) {
    res.status(403).json({ error: "Token inválido o expirado" });
  }
};