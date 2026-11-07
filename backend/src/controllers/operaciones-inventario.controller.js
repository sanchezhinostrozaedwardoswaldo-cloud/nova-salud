
const servicio = require(
  '../services/operaciones-inventario.service'
);

function responderError(error, res, next) {
  if (error instanceof servicio.ErrorOperacion) {
    return res.status(error.status).json({
      success: false,
      message: error.message
    });
  }

  next(error);
}

exports.ajustar = async (req, res, next) => {
  try {
    const resultado = await servicio.ajustarInventario(
      req.body,
      req.usuario.id
    );

    res.json({
      success: true,
      message: 'Inventario ajustado correctamente',
      resultado
    });
  } catch (error) {
    responderError(error, res, next);
  }
};

exports.anularVenta = async (req, res, next) => {
  try {
    const resultado = await servicio.anularVenta(
      req.params.id,
      req.body.motivo,
      req.usuario.id
    );

    res.json({
      success: true,
      message: 'Venta anulada correctamente',
      resultado
    });
  } catch (error) {
    responderError(error, res, next);
  }
};

exports.anularCompra = async (req, res, next) => {
  try {
    const resultado = await servicio.anularCompra(
      req.params.id,
      req.body.motivo,
      req.usuario.id
    );

    res.json({
      success: true,
      message: 'Compra anulada correctamente',
      resultado
    });
  } catch (error) {
    responderError(error, res, next);
  }
};

exports.auditoria = async (req, res, next) => {
  try {
    const resultado = await servicio.listarAuditoria({
      loteId: req.query.lote_id,
      limite: req.query.limite || 50,
      pagina: req.query.pagina || 1
    });

    res.json({
      success: true,
      ...resultado
    });
  } catch (error) {
    responderError(error, res, next);
  }
};
