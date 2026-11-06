const { Proveedor } = require('../models');

function normalizar(body) {
  const datos = {};

  const campos = [
    'razon_social',
    'ruc',
    'telefono',
    'correo',
    'direccion'
  ];

  for (const campo of campos) {
    if (body[campo] !== undefined) {
      datos[campo] =
        typeof body[campo] === 'string'
          ? body[campo].trim()
          : body[campo];
    }
  }

  if (datos.correo) {
    datos.correo = datos.correo.toLowerCase();
  }

  return datos;
}

exports.listar = async (req, res, next) => {
  try {
    const proveedores = await Proveedor.findAll({
      order: [['razon_social', 'ASC']]
    });

    res.json({
      success: true,
      proveedores
    });
  } catch (error) {
    next(error);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const proveedor = await Proveedor.create(
      normalizar(req.body)
    );

    res.status(201).json({
      success: true,
      message: 'Proveedor registrado correctamente',
      proveedor
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un proveedor con ese RUC'
      });
    }

    next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);

    if (!proveedor) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    const cambios = normalizar(req.body);

    if (req.body.activo !== undefined) {
      cambios.activo = req.body.activo;
    }

    await proveedor.update(cambios);

    res.json({
      success: true,
      message: 'Proveedor actualizado correctamente',
      proveedor
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un proveedor con ese RUC'
      });
    }

    next(error);
  }
};