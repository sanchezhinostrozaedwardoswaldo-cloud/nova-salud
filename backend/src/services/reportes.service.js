const { Op, fn, col } = require('sequelize');

const {
  sequelize,
  Producto,
  Lote,
  Compra,
  Venta,
  DetalleVenta
} = require('../models');

const ZONA_HORARIA = 'America/Lima';

function fechaPeru(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(fecha);

  const obtener = (tipo) =>
    partes.find((parte) => parte.type === tipo)?.value;

  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
}

function sumarDias(fechaISO, dias) {
  const fecha = new Date(`${fechaISO}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function rangoFechas(desde, hasta) {
  const hoy = fechaPeru();

  const inicio = desde || sumarDias(hoy, -29);
  const fin = hasta || hoy;

  const patron = /^\d{4}-\d{2}-\d{2}$/;

  for (const fecha of [inicio, fin]) {
    if (!patron.test(fecha)) {
      throw new Error('Formato de fecha inválido');
    }

    const valor = new Date(`${fecha}T12:00:00Z`);

    if (
      Number.isNaN(valor.getTime()) ||
      valor.toISOString().slice(0, 10) !== fecha
    ) {
      throw new Error('Fecha de calendario inválida');
    }
  }

  if (inicio > fin) {
    throw new Error('La fecha inicial no puede superar la final');
  }

  const dias = Math.round(
    (
      Date.parse(`${fin}T12:00:00Z`) -
      Date.parse(`${inicio}T12:00:00Z`)
    ) / 86400000
  );

  if (dias > 365) {
    throw new Error('El período máximo es de 366 días');
  }

  // Inicio y fin del período en hora local de Perú (UTC-5).
  const desdeUTC = new Date(`${inicio}T05:00:00Z`);

  // Límite superior exclusivo: medianoche del día siguiente.
  const hastaUTC = new Date(
    `${sumarDias(fin, 1)}T05:00:00Z`
  );

  return {
    inicio,
    fin,
    desdeUTC,
    hastaUTC
  };
}

function filtroPeriodo(rango) {
  return {
    [Op.gte]: rango.desdeUTC,
    [Op.lt]: rango.hastaUTC
  };
}

function dinero(valor) {
  return Number(Number(valor || 0).toFixed(2));
}

async function resumenInventario() {
  const hoy = fechaPeru();
  const limite = sumarDias(hoy, 30);

  const productos = await Producto.findAll({
    where: { activo: true },
    attributes: [
      'id',
      'codigo',
      'nombre',
      'stock_minimo',
      'precio_venta'
    ],
    include: [{
      model: Lote,
      as: 'lotes',
      attributes: [
        'id',
        'numero_lote',
        'fecha_vencimiento',
        'stock_actual',
        'precio_compra'
      ],
      required: false
    }]
  });

  let unidadesTotales = 0;
  let unidadesDisponibles = 0;
  let unidadesVencidas = 0;
  let valorizacionCentimos = 0;

  const stockBajo = [];
  const proximosVencer = [];
  const vencidos = [];

  for (const producto of productos) {
    let disponible = 0;

    for (const lote of producto.lotes || []) {
      const cantidad = Number(lote.stock_actual);

      if (cantidad <= 0) continue;

      unidadesTotales += cantidad;

      if (lote.fecha_vencimiento < hoy) {
        unidadesVencidas += cantidad;

        vencidos.push({
          producto_id: producto.id,
          producto: producto.nombre,
          lote: lote.numero_lote,
          vencimiento: lote.fecha_vencimiento,
          cantidad
        });

        continue;
      }

      disponible += cantidad;
      unidadesDisponibles += cantidad;

      // Valor estimado al último costo registrado para cada lote.
      valorizacionCentimos +=
        Math.round(Number(lote.precio_compra) * 100) *
        cantidad;

      if (lote.fecha_vencimiento <= limite) {
        proximosVencer.push({
          producto_id: producto.id,
          producto: producto.nombre,
          lote: lote.numero_lote,
          vencimiento: lote.fecha_vencimiento,
          cantidad
        });
      }
    }

    if (disponible <= Number(producto.stock_minimo)) {
      stockBajo.push({
        producto_id: producto.id,
        codigo: producto.codigo,
        producto: producto.nombre,
        disponible,
        minimo: Number(producto.stock_minimo)
      });
    }
  }

  proximosVencer.sort(
    (a, b) => a.vencimiento.localeCompare(b.vencimiento)
  );

  vencidos.sort(
    (a, b) => a.vencimiento.localeCompare(b.vencimiento)
  );

  stockBajo.sort((a, b) => a.disponible - b.disponible);

  return {
    total_productos: productos.length,
    unidades_totales: unidadesTotales,
    unidades_disponibles: unidadesDisponibles,
    unidades_vencidas: unidadesVencidas,
    valorizacion_inventario: dinero(
      valorizacionCentimos / 100
    ),
    cantidad_stock_bajo: stockBajo.length,
    cantidad_proximos_vencer: proximosVencer.length,
    cantidad_lotes_vencidos: vencidos.length,
    stock_bajo: stockBajo,
    proximos_vencer: proximosVencer,
    vencidos
  };
}

async function resumenFinanciero(rango) {
  const [ventas, compras] = await Promise.all([
    Venta.findAll({
      where: {
        estado: 'COMPLETADA',
        fecha: filtroPeriodo(rango)
      },
      attributes: ['id', 'fecha', 'total', 'metodo_pago'],
      raw: true
    }),

    Compra.findAll({
      where: {
        estado: 'REGISTRADA',
        fecha: filtroPeriodo(rango)
      },
      attributes: ['id', 'fecha', 'total'],
      raw: true
    })
  ]);

  const ingresos = ventas.reduce(
    (total, venta) =>
      total + Math.round(Number(venta.total) * 100),
    0
  );

  const gastos = compras.reduce(
    (total, compra) =>
      total + Math.round(Number(compra.total) * 100),
    0
  );

  const ventasPorDia = new Map();

  for (
    let fecha = rango.inicio;
    fecha <= rango.fin;
    fecha = sumarDias(fecha, 1)
  ) {
    ventasPorDia.set(fecha, {
      fecha,
      ventas: 0,
      ingresos: 0
    });
  }

  for (const venta of ventas) {
    const fecha = fechaPeru(new Date(venta.fecha));
    const registro = ventasPorDia.get(fecha);

    if (registro) {
      registro.ventas += 1;
      registro.ingresos +=
        Math.round(Number(venta.total) * 100);
    }
  }

  const metodos = new Map(
    ['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA'].map(
      (metodo) => [
        metodo,
        { metodo, cantidad: 0, total: 0 }
      ]
    )
  );

  for (const venta of ventas) {
    const registro = metodos.get(venta.metodo_pago);

    if (registro) {
      registro.cantidad += 1;
      registro.total +=
        Math.round(Number(venta.total) * 100);
    }
  }

  return {
    cantidad_ventas: ventas.length,
    ingresos_ventas: dinero(ingresos / 100),
    cantidad_compras: compras.length,
    gastos_compras: dinero(gastos / 100),

    ticket_promedio: ventas.length
      ? dinero(ingresos / 100 / ventas.length)
      : 0,

    ventas_por_dia: [...ventasPorDia.values()].map(
      (item) => ({
        ...item,
        ingresos: dinero(item.ingresos / 100)
      })
    ),

    metodos_pago: [...metodos.values()].map(
      (item) => ({
        ...item,
        total: dinero(item.total / 100)
      })
    )
  };
}

async function medicamentosMasVendidos(rango) {
  const ventas = await Venta.findAll({
    where: {
      estado: 'COMPLETADA',
      fecha: filtroPeriodo(rango)
    },
    attributes: ['id'],
    raw: true
  });

  const ids = ventas.map((venta) => venta.id);

  if (ids.length === 0) {
    return [];
  }

  const detalles = await DetalleVenta.findAll({
    where: {
      venta_id: { [Op.in]: ids }
    },
    attributes: ['cantidad', 'subtotal'],
    include: [{
      model: Lote,
      as: 'lote',
      attributes: ['producto_id'],
      include: [{
        model: Producto,
        as: 'producto',
        attributes: ['id', 'codigo', 'nombre']
      }]
    }]
  });

  const agrupados = new Map();

  for (const detalle of detalles) {
    const producto = detalle.lote?.producto;

    if (!producto) continue;

    if (!agrupados.has(producto.id)) {
      agrupados.set(producto.id, {
        producto_id: producto.id,
        codigo: producto.codigo,
        producto: producto.nombre,
        unidades: 0,
        ingresos_centimos: 0
      });
    }

    const registro = agrupados.get(producto.id);

    registro.unidades += Number(detalle.cantidad);
    registro.ingresos_centimos +=
      Math.round(Number(detalle.subtotal) * 100);
  }

  return [...agrupados.values()]
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 10)
    .map(({ ingresos_centimos, ...item }) => ({
      ...item,
      ingresos: dinero(ingresos_centimos / 100)
    }));
}

async function obtenerReporte(desde, hasta) {
  const rango = rangoFechas(desde, hasta);

  const [inventario, financiero, masVendidos] =
    await Promise.all([
      resumenInventario(),
      resumenFinanciero(rango),
      medicamentosMasVendidos(rango)
    ]);

  return {
    periodo: {
      desde: rango.inicio,
      hasta: rango.fin
    },
    generado_en: new Date().toISOString(),
    inventario,
    financiero,
    mas_vendidos: masVendidos
  };
}

module.exports = {
  obtenerReporte,
  fechaPeru,
  rangoFechas
};