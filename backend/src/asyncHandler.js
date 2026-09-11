// Permite que un controlador de Express con async/await pase sus errores
// al manejador de errores central de la aplicación (server.js).
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;