const {
  obtenerReporte
} = require('../services/reportes.service');

exports.obtener = async (req, res, next) => {
  try {
    const { desde, hasta } = req.query;

    const reporte = await obtenerReporte(desde, hasta);

    res.json({
      success: true,
      reporte
    });
  } catch (error) {
    if (
      error.message === 'Formato de fecha inválido' ||
      error.message === 'Fecha de calendario inválida' ||
      error.message === 'La fecha inicial no puede superar la final' ||
      error.message === 'El período máximo es de 366 días'
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};