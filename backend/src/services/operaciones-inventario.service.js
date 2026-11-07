
const { Transaction } = require('sequelize');

const {
  sequelize,
  Producto,
  Lote,
  Compra,
  DetalleCompra,
  Venta,
  DetalleVenta,
  MovimientoInventario
} = require('../models');

class ErrorOperacion extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ErrorOperacion';
    this.status = status;
  }
}

const MAX_STOCK = 2147483647;

function enteroPositivo(valor, nombre) {
  const numero = Number(valor);

  if (!Number.isSafeInteger(numero) || numero <= 0) {
    throw new ErrorOperacion(`${nombre} inválido`);
  }

  return numero;
}

function motivoValido(valor) {
  if (typeof valor !== 'string') {
    throw new ErrorOperacion('Debes indicar un motivo');
  }

  const motivo = valor.trim();

  if (motivo.length < 10 || motivo.length > 180) {
    throw new ErrorOperacion(
      'El motivo debe tener entre 10 y 180 caracteres'
    );
  }

  return motivo;
}

function validarStock(nuevo) {
  if (
    !Number.isSafeInteger(nuevo) ||
    nuevo < 0 ||
    nuevo > MAX_STOCK
  ) {
    throw new ErrorOperacion(
      'La operación produciría un stock inválido'
    );
  }
}

async function bloquearProductos(ids, transaction) {
  const unicos = [...new Set(ids)]
    .sort((a, b) => a - b);

  for (const id of unicos) {
    const producto = await Producto.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!producto) {
      throw new ErrorOperacion(
        `El producto ${id} ya no existe`, 404
      );
    }
  }
}

async function bloquearLotes(ids, transaction) {
  const lotes = new Map();

  for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
    const lote = await Lote.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!lote) {
      throw new ErrorOperacion(
        `El lote ${id} ya no existe`, 404
      );
    }

    lotes.set(id, lote);
  }

  return lotes;
}

async function registrarMovimiento({
  lote,
  usuarioId,
  tipo,
  diferencia,
  motivo,
  compraId = null,
  ventaId = null,
  transaction
}) {
  const anterior = Number(lote.stock_actual);
  const nuevo = anterior + diferencia;

  validarStock(nuevo);

  await lote.update(
    { stock_actual: nuevo },
    { transaction }
  );

  await MovimientoInventario.create(
    {
      lote_id: lote.id,
      usuario_id: usuarioId,
      tipo,
      cantidad: diferencia,
      stock_anterior: anterior,
      stock_nuevo: nuevo,
      motivo,
      compra_id: compraId,
      venta_id: ventaId
    },
    { transaction }
  );

  return { anterior, nuevo };
}

async function ajustarInventario(datos, usuarioId) {
  const loteId = enteroPositivo(datos.lote_id, 'Lote');
  const stockObjetivo = Number(datos.stock_nuevo);
  const motivo = motivoValido(datos.motivo);

  if (
    !Number.isSafeInteger(stockObjetivo) ||
    stockObjetivo < 0 ||
    stockObjetivo > MAX_STOCK
  ) {
    throw new ErrorOperacion(
      'El nuevo stock debe ser un entero no negativo'
    );
  }

  return sequelize.transaction(
    {
      isolationLevel:
        Transaction.ISOLATION_LEVELS.READ_COMMITTED
    },
    async (transaction) => {
      // Primero se identifica el producto; después se
      // bloquea en el mismo orden que compras y ventas.
      const referencia = await Lote.findByPk(loteId, {
        attributes: ['id', 'producto_id'],
        transaction
      });

      if (!referencia) {
        throw new ErrorOperacion('Lote no encontrado', 404);
      }

      await bloquearProductos(
        [referencia.producto_id],
        transaction
      );

      const lotes = await bloquearLotes(
        [loteId],
        transaction
      );

      const lote = lotes.get(loteId);
      const anterior = Number(lote.stock_actual);
      const diferencia = stockObjetivo - anterior;

      if (diferencia === 0) {
        throw new ErrorOperacion(
          'El stock indicado es igual al actual'
        );
      }

      await registrarMovimiento({
        lote,
        usuarioId,
        tipo: 'AJUSTE',
        diferencia,
        motivo: `Ajuste manual: ${motivo}`,
        transaction
      });

      return {
        lote_id: lote.id,
        stock_anterior: anterior,
        stock_nuevo: stockObjetivo,
        diferencia,
        motivo
      };
    }
  );
}

async function anularVenta(id, motivoTexto, usuarioId) {
  const ventaId = enteroPositivo(id, 'Venta');
  const motivo = motivoValido(motivoTexto);

  return sequelize.transaction(
    {
      isolationLevel:
        Transaction.ISOLATION_LEVELS.READ_COMMITTED
    },
    async (transaction) => {
      // Bloqueamos primero la operación para impedir
      // que dos administradores la anulen simultáneamente.
      const venta = await Venta.findByPk(ventaId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!venta) {
        throw new ErrorOperacion('Venta no encontrada', 404);
      }

      if (venta.estado !== 'COMPLETADA') {
        throw new ErrorOperacion(
          'Esta venta ya fue anulada', 409
        );
      }

      const detalles = await DetalleVenta.findAll({
        where: { venta_id: ventaId },
        transaction
      });

      if (!detalles.length) {
        throw new ErrorOperacion(
          'La venta no contiene detalles'
        );
      }

      const idsLotes = detalles.map((d) => d.lote_id);

      const referencias = await Lote.findAll({
        where: { id: idsLotes },
        attributes: ['id', 'producto_id'],
        transaction
      });

      if (referencias.length !== new Set(idsLotes).size) {
        throw new ErrorOperacion(
          'Faltan lotes relacionados con la venta'
        );
      }

      await bloquearProductos(
        referencias.map((l) => l.producto_id),
        transaction
      );

      const lotes = await bloquearLotes(
        idsLotes,
        transaction
      );

      // Agrupar cantidades por lote para controlar
      // el stock y generar una reversión por lote.
      const cantidades = new Map();

      for (const detalle of detalles) {
        const cantidad = Number(detalle.cantidad);

        cantidades.set(
          detalle.lote_id,
          (cantidades.get(detalle.lote_id) || 0) +
            cantidad
        );
      }

      for (const [loteId, cantidad] of [...cantidades]
        .sort((a, b) => a[0] - b[0])) {
        const lote = lotes.get(loteId);

        await registrarMovimiento({
          lote,
          usuarioId,
          tipo: 'ENTRADA',
          diferencia: cantidad,
          motivo:
            `Reversión venta #${ventaId}: ${motivo}`,
          ventaId,
          transaction
        });
      }

      await venta.update(
        { estado: 'ANULADA' },
        { transaction }
      );

      return {
        id: venta.id,
        estado: venta.estado,
        motivo,
        lotes_revertidos: cantidades.size
      };
    }
  );
}

async function anularCompra(id, motivoTexto, usuarioId) {
  const compraId = enteroPositivo(id, 'Compra');
  const motivo = motivoValido(motivoTexto);

  return sequelize.transaction(
    {
      isolationLevel:
        Transaction.ISOLATION_LEVELS.READ_COMMITTED
    },
    async (transaction) => {
      const compra = await Compra.findByPk(compraId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!compra) {
        throw new ErrorOperacion('Compra no encontrada', 404);
      }

      if (compra.estado !== 'REGISTRADA') {
        throw new ErrorOperacion(
          'Esta compra ya fue anulada', 409
        );
      }

      const detalles = await DetalleCompra.findAll({
        where: { compra_id: compraId },
        transaction
      });

      if (!detalles.length) {
        throw new ErrorOperacion(
          'La compra no contiene detalles'
        );
      }

      const idsLotes = detalles.map((d) => d.lote_id);

      const referencias = await Lote.findAll({
        where: { id: idsLotes },
        attributes: ['id', 'producto_id'],
        transaction
      });

      if (referencias.length !== new Set(idsLotes).size) {
        throw new ErrorOperacion(
          'Faltan lotes relacionados con la compra'
        );
      }

      await bloquearProductos(
        referencias.map((l) => l.producto_id),
        transaction
      );

      const lotes = await bloquearLotes(
        idsLotes,
        transaction
      );

      const cantidades = new Map();

      for (const detalle of detalles) {
        cantidades.set(
          detalle.lote_id,
          (cantidades.get(detalle.lote_id) || 0) +
            Number(detalle.cantidad)
        );
      }

      // Validar TODOS los lotes antes de descontar.
      for (const [loteId, cantidad] of cantidades) {
        const lote = lotes.get(loteId);

        if (Number(lote.stock_actual) < cantidad) {
          throw new ErrorOperacion(
            `No se puede anular la compra: el lote ` +
            `${lote.numero_lote} tiene ` +
            `${lote.stock_actual} unidades, pero se ` +
            `necesitan ${cantidad}.`,
            409
          );
        }
      }

      for (const [loteId, cantidad] of [...cantidades]
        .sort((a, b) => a[0] - b[0])) {
        const lote = lotes.get(loteId);

        await registrarMovimiento({
          lote,
          usuarioId,
          tipo: 'SALIDA',
          diferencia: -cantidad,
          motivo:
            `Reversión compra #${compraId}: ${motivo}`,
          compraId,
          transaction
        });
      }

      await compra.update(
        { estado: 'ANULADA' },
        { transaction }
      );

      return {
        id: compra.id,
        estado: compra.estado,
        motivo,
        lotes_revertidos: cantidades.size
      };
    }
  );
}

async function listarAuditoria({
  loteId,
  limite = 50,
  pagina = 1
}) {
  const where = {};

  if (loteId !== undefined) {
    where.lote_id = enteroPositivo(loteId, 'Lote');
  }

  const limit = Math.min(
    100,
    enteroPositivo(limite, 'Límite')
  );

  const numeroPagina = enteroPositivo(pagina, 'Página');

  if (numeroPagina > 10000) {
    throw new ErrorOperacion('Página fuera de rango');
  }

  const { count, rows } =
    await MovimientoInventario.findAndCountAll({
      where,
      limit,
      offset: (numeroPagina - 1) * limit,
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC']
      ],
      attributes: [
        'id',
        'lote_id',
        'usuario_id',
        'tipo',
        'cantidad',
        'stock_anterior',
        'stock_nuevo',
        'motivo',
        'compra_id',
        'venta_id',
        'createdAt'
      ]
    });

  return {
    total: count,
    pagina: numeroPagina,
    limite: limit,
    movimientos: rows
  };
}

module.exports = {
  ErrorOperacion,
  ajustarInventario,
  anularVenta,
  anularCompra,
  listarAuditoria
};
