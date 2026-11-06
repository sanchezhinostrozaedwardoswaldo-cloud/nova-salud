const { Transaction } = require('sequelize');

const {
  sequelize,
  Proveedor,
  Producto,
  Lote,
  Compra,
  DetalleCompra,
  MovimientoInventario
} = require('../models');

class ErrorCompra extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ErrorCompra';
    this.status = status;
  }
}

function centimos(valor) {
  const numero = Number(valor);

  if (
    !Number.isFinite(numero) ||
    numero < 0 ||
    numero > 9999999999.99
  ) {
    throw new ErrorCompra('Precio inválido');
  }

  const resultado = Math.round(numero * 100);

  if (Math.abs(numero * 100 - resultado) > 0.000001) {
    throw new ErrorCompra(
      'Los precios deben tener como máximo dos decimales'
    );
  }

  return resultado;
}

function dinero(centavos) {
  return (centavos / 100).toFixed(2);
}

function fechaActual() {
  return new Date().toISOString().slice(0, 10);
}

function validarDetalles(detalles) {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    throw new ErrorCompra('Agrega al menos un medicamento');
  }

  if (detalles.length > 100) {
    throw new ErrorCompra('La compra admite como máximo 100 líneas');
  }

  const claves = new Set();

  return detalles.map((item) => {
    const productoId = Number(item.producto_id);
    const cantidad = Number(item.cantidad);
    const numeroLote = String(item.numero_lote || '').trim();
    const vencimiento = String(item.fecha_vencimiento || '');

    if (!Number.isSafeInteger(productoId) || productoId <= 0) {
      throw new ErrorCompra('Identificador de producto inválido');
    }

    if (
      !Number.isSafeInteger(cantidad) ||
      cantidad <= 0 ||
      cantidad > 1000000
    ) {
      throw new ErrorCompra('Cantidad inválida');
    }

    if (!numeroLote || numeroLote.length > 100) {
      throw new ErrorCompra('Número de lote inválido');
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(vencimiento) ||
      !Number.isFinite(Date.parse(`${vencimiento}T00:00:00Z`)) ||
      new Date(`${vencimiento}T00:00:00Z`)
        .toISOString().slice(0, 10) !== vencimiento
    ) {
      throw new ErrorCompra('Fecha de vencimiento inválida');
    }

    if (vencimiento < fechaActual()) {
      throw new ErrorCompra(
        `No puedes ingresar un lote vencido: ${numeroLote}`
      );
    }

    const clave = `${productoId}:${numeroLote}`;

    if (claves.has(clave)) {
      throw new ErrorCompra(
        `El lote ${numeroLote} está repetido en la compra`
      );
    }

    claves.add(clave);

    const precioCentimos = centimos(item.precio_unitario);
    const subtotalCentimos = precioCentimos * cantidad;

    if (!Number.isSafeInteger(subtotalCentimos)) {
      throw new ErrorCompra('Subtotal fuera del rango permitido');
    }

    return {
      producto_id: productoId,
      cantidad,
      numero_lote: numeroLote,
      fecha_vencimiento: vencimiento,
      precio_unitario: dinero(precioCentimos),
      subtotal_centimos: subtotalCentimos
    };
  });
}

async function registrarCompra(datos, usuarioId) {
  const detalles = validarDetalles(datos.detalles);

  const proveedorId = Number(datos.proveedor_id);

  if (!Number.isSafeInteger(proveedorId) || proveedorId <= 0) {
    throw new ErrorCompra('Proveedor inválido');
  }

  const totalCentimos = detalles.reduce(
    (total, item) => total + item.subtotal_centimos,
    0
  );

  if (!Number.isSafeInteger(totalCentimos) ||
      totalCentimos > 999999999999) {
    throw new ErrorCompra('Total de compra fuera de rango');
  }

  return sequelize.transaction(
    {
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    },
    async (transaction) => {
      const proveedor = await Proveedor.findByPk(proveedorId, {
        transaction
      });

      if (!proveedor || !proveedor.activo) {
        throw new ErrorCompra('Selecciona un proveedor activo');
      }

      // Bloquear productos en orden estable para evitar
      // interbloqueos entre compras simultáneas.
      const ids = [...new Set(
        detalles.map((item) => item.producto_id)
      )].sort((a, b) => a - b);

      const productos = new Map();

      for (const id of ids) {
        const producto = await Producto.findByPk(id, {
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!producto || !producto.activo) {
          throw new ErrorCompra(
            `El producto ${id} no existe o está inactivo`
          );
        }

        productos.set(id, producto);
      }

      const compra = await Compra.create(
        {
          proveedor_id: proveedorId,
          usuario_id: usuarioId,
          numero_documento:
            datos.numero_documento?.trim() || null,
          fecha: new Date(),
          total: dinero(totalCentimos),
          estado: 'REGISTRADA'
        },
        { transaction }
      );

      for (const item of detalles) {
        const producto = productos.get(item.producto_id);

        let lote = await Lote.findOne({
          where: {
            producto_id: producto.id,
            numero_lote: item.numero_lote
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (lote) {
          if (lote.fecha_vencimiento !== item.fecha_vencimiento) {
            throw new ErrorCompra(
              `El lote ${item.numero_lote} ya existe con otra fecha de vencimiento`
            );
          }
        } else {
          lote = await Lote.create(
            {
              producto_id: producto.id,
              numero_lote: item.numero_lote,
              fecha_vencimiento: item.fecha_vencimiento,
              stock_actual: 0,
              precio_compra: item.precio_unitario
            },
            { transaction }
          );
        }

        const stockAnterior = Number(lote.stock_actual);
        const stockNuevo = stockAnterior + item.cantidad;

        if (!Number.isSafeInteger(stockNuevo) ||
            stockNuevo > 2147483647) {
          throw new ErrorCompra(
            `El stock del lote ${item.numero_lote} supera el límite permitido`
          );
        }

        await lote.update(
          {
            stock_actual: stockNuevo,
            precio_compra: item.precio_unitario
          },
          { transaction }
        );

        await DetalleCompra.create(
          {
            compra_id: compra.id,
            lote_id: lote.id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: dinero(item.subtotal_centimos)
          },
          { transaction }
        );

        await MovimientoInventario.create(
          {
            lote_id: lote.id,
            usuario_id: usuarioId,
            tipo: 'ENTRADA',
            cantidad: item.cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            motivo: `Ingreso por compra #${compra.id}`,
            compra_id: compra.id,
            venta_id: null
          },
          { transaction }
        );
      }

      return compra;
    }
  );
}

module.exports = {
  registrarCompra,
  ErrorCompra
};