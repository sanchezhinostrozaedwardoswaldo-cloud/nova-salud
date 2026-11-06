const { Op, Transaction } = require('sequelize');

const {
  sequelize,
  Cliente,
  Producto,
  Lote,
  Venta,
  DetalleVenta,
  MovimientoInventario
} = require('../models');

class ErrorVenta extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ErrorVenta';
    this.status = status;
  }
}

function fechaActual() {
  return new Date().toISOString().slice(0, 10);
}

function convertirCentimos(valor) {
  const numero = Number(valor);

  if (
    !Number.isFinite(numero) ||
    numero < 0 ||
    numero > 9999999999.99
  ) {
    throw new ErrorVenta('Precio de venta inválido');
  }

  const resultado = Math.round(numero * 100);

  if (Math.abs(numero * 100 - resultado) > 0.000001) {
    throw new ErrorVenta('El precio tiene demasiados decimales');
  }

  return resultado;
}

function dinero(centimos) {
  return (centimos / 100).toFixed(2);
}

function prepararDetalles(detalles) {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    throw new ErrorVenta('Agrega al menos un medicamento');
  }

  if (detalles.length > 100) {
    throw new ErrorVenta('La venta admite como máximo 100 líneas');
  }

  const agrupados = new Map();

  for (const item of detalles) {
    const productoId = Number(item.producto_id);
    const cantidad = Number(item.cantidad);

    if (!Number.isSafeInteger(productoId) || productoId <= 0) {
      throw new ErrorVenta('Producto inválido');
    }

    if (
      !Number.isSafeInteger(cantidad) ||
      cantidad <= 0 ||
      cantidad > 1000000
    ) {
      throw new ErrorVenta('Cantidad inválida');
    }

    const acumulado = (agrupados.get(productoId) || 0) + cantidad;

    if (!Number.isSafeInteger(acumulado) || acumulado > 1000000) {
      throw new ErrorVenta('Cantidad acumulada fuera de rango');
    }

    agrupados.set(productoId, acumulado);
  }

  return [...agrupados.entries()]
    .map(([producto_id, cantidad]) => ({
      producto_id,
      cantidad
    }))
    .sort((a, b) => a.producto_id - b.producto_id);
}

async function registrarVenta(datos, usuarioId) {
  const detalles = prepararDetalles(datos.detalles);

  const metodos = ['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA'];

  if (!metodos.includes(datos.metodo_pago)) {
    throw new ErrorVenta('Método de pago inválido');
  }

  let clienteId = null;

  if (datos.cliente_id !== null &&
      datos.cliente_id !== undefined &&
      datos.cliente_id !== '') {
    clienteId = Number(datos.cliente_id);

    if (!Number.isSafeInteger(clienteId) || clienteId <= 0) {
      throw new ErrorVenta('Cliente inválido');
    }
  }

  return sequelize.transaction(
    {
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    },
    async (transaction) => {
      if (clienteId !== null) {
        const cliente = await Cliente.findByPk(clienteId, {
          transaction
        });

        if (!cliente) {
          throw new ErrorVenta('El cliente seleccionado no existe');
        }
      }

      const productos = [];
      let totalCentimos = 0;

      // El orden estable evita interbloqueos cuando dos ventas
      // incluyen los mismos productos.
      for (const item of detalles) {
        const producto = await Producto.findByPk(
          item.producto_id,
          {
            transaction,
            lock: transaction.LOCK.UPDATE
          }
        );

        if (!producto || !producto.activo) {
          throw new ErrorVenta(
            `El producto ${item.producto_id} no está disponible`
          );
        }

        const precioCentimos = convertirCentimos(
          producto.precio_venta
        );

        const subtotal = precioCentimos * item.cantidad;

        if (!Number.isSafeInteger(subtotal)) {
          throw new ErrorVenta('Subtotal fuera de rango');
        }

        totalCentimos += subtotal;

        if (!Number.isSafeInteger(totalCentimos) ||
            totalCentimos > 999999999999) {
          throw new ErrorVenta('Total fuera de rango');
        }

        productos.push({
          producto,
          cantidad: item.cantidad,
          precio_unitario: dinero(precioCentimos)
        });
      }

      const hoy = fechaActual();

      // Comprobar todas las existencias antes de crear la venta.
      const asignaciones = [];

      for (const item of productos) {
        const lotes = await Lote.findAll({
          where: {
            producto_id: item.producto.id,
            fecha_vencimiento: {
              [Op.gte]: hoy
            },
            stock_actual: {
              [Op.gt]: 0
            }
          },
          order: [
            ['fecha_vencimiento', 'ASC'],
            ['id', 'ASC']
          ],
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        let pendiente = item.cantidad;
        const asignacionesProducto = [];

        for (const lote of lotes) {
          if (pendiente === 0) break;

          const disponible = Number(lote.stock_actual);
          const cantidad = Math.min(disponible, pendiente);

          if (cantidad <= 0) continue;

          asignacionesProducto.push({
            lote,
            cantidad,
            precio_unitario: item.precio_unitario
          });

          pendiente -= cantidad;
        }

        if (pendiente > 0) {
          const disponible = item.cantidad - pendiente;

          throw new ErrorVenta(
            `Stock insuficiente para ${item.producto.nombre}. ` +
            `Solicitado: ${item.cantidad}. Disponible: ${disponible}.`
          );
        }

        asignaciones.push(...asignacionesProducto);
      }

      const venta = await Venta.create(
        {
          cliente_id: clienteId,
          usuario_id: usuarioId,
          fecha: new Date(),
          total: dinero(totalCentimos),
          metodo_pago: datos.metodo_pago,
          estado: 'COMPLETADA'
        },
        { transaction }
      );

      for (const asignacion of asignaciones) {
        const {
          lote,
          cantidad,
          precio_unitario
        } = asignacion;

        const stockAnterior = Number(lote.stock_actual);
        const stockNuevo = stockAnterior - cantidad;

        if (stockNuevo < 0) {
          throw new ErrorVenta(
            'Se detectó una inconsistencia en las existencias'
          );
        }

        await lote.update(
          { stock_actual: stockNuevo },
          { transaction }
        );

        const subtotalCentimos =
          convertirCentimos(precio_unitario) * cantidad;

        await DetalleVenta.create(
          {
            venta_id: venta.id,
            lote_id: lote.id,
            cantidad,
            precio_unitario,
            subtotal: dinero(subtotalCentimos)
          },
          { transaction }
        );

        await MovimientoInventario.create(
          {
            lote_id: lote.id,
            usuario_id: usuarioId,
            tipo: 'SALIDA',
            cantidad: -cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            motivo: `Salida por venta #${venta.id}`,
            compra_id: null,
            venta_id: venta.id
          },
          { transaction }
        );
      }

      return venta;
    }
  );
}

module.exports = {
  registrarVenta,
  ErrorVenta
};