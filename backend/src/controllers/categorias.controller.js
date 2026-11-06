const { Categoria, Producto } = require('../models');

exports.listar = async (req, res, next) => {
  try {
    const categorias = await Categoria.findAll({
      order: [['nombre', 'ASC']]
    });

    res.json({ success: true, categorias });
  } catch (error) {
    next(error);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;

    const categoria = await Categoria.create({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null
    });

    res.status(201).json({
      success: true,
      message: 'Categoría registrada correctamente',
      categoria
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre'
      });
    }
    next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const categoria = await Categoria.findByPk(req.params.id);

    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    const cambios = {};

    if (req.body.nombre !== undefined) {
      cambios.nombre = req.body.nombre.trim();
    }

    if (req.body.descripcion !== undefined) {
      cambios.descripcion = req.body.descripcion?.trim() || null;
    }

    if (req.body.activo !== undefined) {
      cambios.activo = req.body.activo;
    }

    await categoria.update(cambios);

    res.json({
      success: true,
      message: 'Categoría actualizada correctamente',
      categoria
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre'
      });
    }
    next(error);
  }
};