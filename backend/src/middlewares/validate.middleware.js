const { validationResult } = require('express-validator');

module.exports = (req, res, next) => {
  const errores = validationResult(req);

  if (!errores.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Verifica los datos ingresados',
      errores: errores.array().map((e) => ({
        campo: e.path,
        mensaje: e.msg
      }))
    });
  }

  next();
};