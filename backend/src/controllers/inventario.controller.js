const { Op } = require('sequelize');
const {
  Producto,
  Categoria,
  Lote
} = require('../models');

function fechaLocalISO(fecha) {
  return fecha.toISOString().slice(0, 10);
}

exports.listarLotes = async (req, res, next) => {
  try {
    const where = {};

    if (req.query.producto_id) {
      where.producto_id = req.query.producto_id;
    }

    const lotes = await Lote.findAll({
      where,
      include: [{
        model: Producto,
        as: 'producto',
        attributes: ['id', 'codigo', 'nombre']
      }],
      order: [
        ['fecha_vencimiento', 'ASC'],
        ['id', 'ASC']
      ]
    });

    const hoy = fechaLocalISO(new Date());

    res.json({
      success: true,
      lotes: lotes.map((lote) => ({
        ...lote.toJSON(),
        vencido: lote.fecha_vencimiento < hoy
      }))
    });
  } catch (error) {
    next(error);
  }
};

exports.resumen = async (req, res, next) => {
  try {
    const productos = await Producto.findAll({
      where: { activo: true },
      include: [
        {
          model: Categoria,
          as: 'categoria',
          attributes: ['nombre']
        },
        {
          model: Lote,
          as: 'lotes'
        }
      ]
    });

    const hoy = new Date();
    const hoyISO = fechaLocalISO(hoy);

    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 30);
    const limiteISO = fechaLocalISO(limite);

    const inventario = productos.map((producto) => {
      let stockTotal = 0;
      let stockDisponible = 0;
      let stockVencido = 0;
      let proximosVencer = 0;

      for (const lote of producto.lotes) {
        const cantidad = Number(lote.stock_actual);
        stockTotal += cantidad;

        if (lote.fecha_vencimiento < hoyISO) {
          stockVencido += cantidad;
        } else {
          stockDisponible += cantidad;

          if (lote.fecha_vencimiento <= limiteISO) {
            proximosVencer += cantidad;
          }
        }
      }

      return {
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria?.nombre,
        stock_minimo: producto.stock_minimo,
        stock_total: stockTotal,
        stock_disponible: stockDisponible,
        stock_vencido: stockVencido,
        proximos_vencer: proximosVencer,
        stock_bajo: stockDisponible <= producto.stock_minimo
      };
    });

    const alertas = {
      stock_bajo: inventario.filter((p) => p.stock_bajo),
      proximos_vencer: inventario.filter((p) => p.proximos_vencer > 0),
      vencidos: inventario.filter((p) => p.stock_vencido > 0)
    };

    res.json({
      success: true,
      total_productos: inventario.length,
      inventario,
      alertas
    });
  } catch (error) {
    next(error);
  }
};