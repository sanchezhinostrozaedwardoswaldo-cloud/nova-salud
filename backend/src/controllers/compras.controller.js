const {
  Compra,
  DetalleCompra,
  Lote,
  Producto,
  Proveedor,
  Usuario,
  MovimientoInventario
} = require('../models');

const {
  registrarCompra,
  ErrorCompra
} = require('../services/compras.service');

const asociaciones = [
  {
    model: Proveedor,
    as: 'proveedor',
    attributes: ['id', 'razon_social', 'ruc']
  },
  {
    model: Usuario,
    as: 'usuario',
    attributes: ['id', 'nombre', 'apellido']
  }
];

exports.listar = async (req, res, next) => {
  try {
    const compras = await Compra.findAll({
      include: asociaciones,
      order: [['fecha', 'DESC'], ['id', 'DESC']]
    });

    res.json({ success: true, compras });
  } catch (error) {
    next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const compra = await Compra.findByPk(req.params.id, {
      include: [
        ...asociaciones,
        {
          model: DetalleCompra,
          as: 'detalles',
          include: [{
            model: Lote,
            as: 'lote',
            include: [{
              model: Producto,
              as: 'producto',
              attributes: ['id', 'codigo', 'nombre']
            }]
          }]
        }
      ]
    });

    if (!compra) {
      return res.status(404).json({
        success: false,
        message: 'Compra no encontrada'
      });
    }

    res.json({ success: true, compra });
  } catch (error) {
    next(error);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const compra = await registrarCompra(
      req.body,
      req.usuario.id
    );

    res.status(201).json({
      success: true,
      message: 'Compra registrada e inventario actualizado',
      compra_id: compra.id,
      total: compra.total
    });
  } catch (error) {
    if (error instanceof ErrorCompra) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};

exports.movimientos = async (req, res, next) => {
  try {
    const movimientos = await MovimientoInventario.findAll({
      include: [{
        model: Lote,
        as: 'lote',
        include: [{
          model: Producto,
          as: 'producto',
          attributes: ['codigo', 'nombre']
        }]
      }],
      order: [['id', 'DESC']],
      limit: 200
    });

    res.json({ success: true, movimientos });
  } catch (error) {
    next(error);
  }
};