const { Op, fn, col, literal } = require('sequelize');

const {
  Producto,
  Categoria,
  Lote
} = require('../models');

const campos = [
  'codigo',
  'nombre',
  'descripcion',
  'laboratorio',
  'presentacion',
  'precio_venta',
  'stock_minimo',
  'categoria_id'
];

const incluirCategoria = {
  model: Categoria,
  as: 'categoria',
  attributes: ['id', 'nombre']
};

function prepararDatos(body) {
  const datos = {};

  for (const campo of campos) {
    if (body[campo] !== undefined) {
      datos[campo] = body[campo];
    }
  }

  for (const campo of [
    'codigo',
    'nombre',
    'descripcion',
    'laboratorio',
    'presentacion'
  ]) {
    if (typeof datos[campo] === 'string') {
      datos[campo] = datos[campo].trim();
    }
  }

  return datos;
}

async function obtenerStock(productoId) {
  const lotes = await Lote.findAll({
    where: { producto_id: productoId },
    attributes: ['stock_actual', 'fecha_vencimiento']
  });

  const hoy = new Date().toISOString().slice(0, 10);

  return lotes.reduce((acc, lote) => {
    const cantidad = Number(lote.stock_actual);

    acc.stock_total += cantidad;

    if (lote.fecha_vencimiento >= hoy) {
      acc.stock_disponible += cantidad;
    }

    return acc;
  }, {
    stock_total: 0,
    stock_disponible: 0
  });
}

exports.listar = async (req, res, next) => {
  try {
    const {
      buscar = '',
      categoria_id,
      activo
    } = req.query;

    const where = {};

    if (buscar) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${buscar}%` } },
        { codigo: { [Op.iLike]: `%${buscar}%` } },
        { laboratorio: { [Op.iLike]: `%${buscar}%` } }
      ];
    }

    if (categoria_id) {
      where.categoria_id = categoria_id;
    }

    if (activo === 'true' || activo === 'false') {
      where.activo = activo === 'true';
    }

    const productos = await Producto.findAll({
      where,
      include: [incluirCategoria],
      order: [['nombre', 'ASC']]
    });

    const resultado = await Promise.all(
      productos.map(async (producto) => ({
        ...producto.toJSON(),
        ...(await obtenerStock(producto.id))
      }))
    );

    res.json({
      success: true,
      productos: resultado
    });
  } catch (error) {
    next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id, {
      include: [
        incluirCategoria,
        {
          model: Lote,
          as: 'lotes',
          order: [['fecha_vencimiento', 'ASC']]
        }
      ]
    });

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      producto: {
        ...producto.toJSON(),
        ...(await obtenerStock(producto.id))
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const datos = prepararDatos(req.body);

    const categoria = await Categoria.findByPk(datos.categoria_id);

    if (!categoria || !categoria.activo) {
      return res.status(400).json({
        success: false,
        message: 'Selecciona una categoría activa'
      });
    }

    const producto = await Producto.create(datos);

    res.status(201).json({
      success: true,
      message: 'Producto registrado correctamente',
      producto
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'El código del producto ya existe'
      });
    }
    next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id);

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    const datos = prepararDatos(req.body);

    if (datos.categoria_id !== undefined) {
      const categoria = await Categoria.findByPk(datos.categoria_id);

      if (!categoria || !categoria.activo) {
        return res.status(400).json({
          success: false,
          message: 'Selecciona una categoría activa'
        });
      }
    }

    if (req.body.activo !== undefined) {
      datos.activo = req.body.activo;
    }

    await producto.update(datos);

    res.json({
      success: true,
      message: 'Producto actualizado correctamente',
      producto
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'El código del producto ya existe'
      });
    }
    next(error);
  }
};