const { Cliente } = require('../models');

const campos = [
  'nombre',
  'apellido',
  'tipo_documento',
  'numero_documento',
  'telefono',
  'correo'
];

function prepararDatos(body) {
  const datos = {};

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
    const clientes = await Cliente.findAll({
      order: [['id', 'DESC']]
    });

    res.json({ success: true, clientes });
  } catch (error) {
    next(error);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const cliente = await Cliente.create(
      prepararDatos(req.body)
    );

    res.status(201).json({
      success: true,
      message: 'Cliente registrado correctamente',
      cliente
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un cliente con ese documento'
      });
    }

    next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    await cliente.update(prepararDatos(req.body));

    res.json({
      success: true,
      message: 'Cliente actualizado correctamente',
      cliente
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'El documento ya pertenece a otro cliente'
      });
    }

    next(error);
  }
};