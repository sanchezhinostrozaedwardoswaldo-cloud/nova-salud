const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function firmarToken(usuario) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no configurado');
  }

  return jwt.sign(
    { rol: usuario.rol },
    process.env.JWT_SECRET,
    {
      subject: String(usuario.id),
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      algorithm: 'HS256'
    }
  );
}

function usuarioPublico(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    correo: usuario.correo,
    rol: usuario.rol,
    activo: usuario.activo
  };
}

module.exports = {
  hashPassword: (password) => bcrypt.hash(password, 12),
  verificarPassword: (password, hash) =>
    bcrypt.compare(password, hash),
  firmarToken,
  usuarioPublico
};