const jwt = require('jsonwebtoken');

// Verifica el JWT enviado en el header Authorization: Bearer <token>
// Ninguna operación clínica puede ejecutarse sin una sesión válida (ver
// relación <<include>> Autenticación en el diagrama de casos de uso).
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No se envió un token de sesión.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { id, rol, nombre, correo }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
}

// Control de acceso basado en roles (RBAC): cada actor solo accede a lo
// que le corresponde según el diagrama de casos de uso del capítulo 3.
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
