const {
  Venta,
  DetalleVenta,
  Lote,
  Producto,
  Cliente,
  Usuario
} = require('../models');

const {
  registrarVenta,
  ErrorVenta
} = require('../services/ventas.service');

const asociaciones = [
  {
    model: Cliente,
    as: 'cliente',
    attributes: [
      'id',
      'nombre',
      'apellido',
      'numero_documento'
    ]
  },
  {
    model: Usuario,
    as: 'usuario',
    attributes: ['id', 'nombre', 'apellido']
  }
];

exports.listar = async (req, res, next) => {
  try {
    const ventas = await Venta.findAll({
      include: asociaciones,
      order: [['fecha', 'DESC'], ['id', 'DESC']]
    });

    res.json({ success: true, ventas });
  } catch (error) {
    next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const venta = await Venta.findByPk(req.params.id, {
      include: [
        ...asociaciones,
        {
          model: DetalleVenta,
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

    if (!venta) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    res.json({ success: true, venta });
  } catch (error) {
    next(error);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const venta = await registrarVenta(
      req.body,
      req.usuario.id
    );

    res.status(201).json({
      success: true,
      message: 'Venta registrada e inventario actualizado',
      venta_id: venta.id,
      total: venta.total
    });
  } catch (error) {
    if (error instanceof ErrorVenta) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};