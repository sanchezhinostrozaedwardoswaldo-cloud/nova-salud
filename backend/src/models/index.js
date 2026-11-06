const db = require('./definitions');

const {
  Categoria,
  Producto,
  Lote,
  Proveedor,
  Cliente,
  Usuario,
  Compra,
  DetalleCompra,
  Venta,
  DetalleVenta,
  MovimientoInventario,
  Alerta
} = db;

function relacionPadreHijo(Padre, Hijo, foreignKey, aliasPadre, aliasHijo) {
  Padre.hasMany(Hijo, {
    foreignKey,
    as: aliasPadre
  });

  Hijo.belongsTo(Padre, {
    foreignKey,
    as: aliasHijo
  });
}

relacionPadreHijo(
  Categoria, Producto,
  'categoria_id', 'productos', 'categoria'
);

relacionPadreHijo(
  Producto, Lote,
  'producto_id', 'lotes', 'producto'
);

relacionPadreHijo(
  Proveedor, Compra,
  'proveedor_id', 'compras', 'proveedor'
);

relacionPadreHijo(
  Usuario, Compra,
  'usuario_id', 'comprasRegistradas', 'usuario'
);

relacionPadreHijo(
  Compra, DetalleCompra,
  'compra_id', 'detalles', 'compra'
);

relacionPadreHijo(
  Lote, DetalleCompra,
  'lote_id', 'detallesCompra', 'lote'
);

relacionPadreHijo(
  Usuario, Venta,
  'usuario_id', 'ventasRegistradas', 'usuario'
);

relacionPadreHijo(
  Cliente, Venta,
  'cliente_id', 'ventas', 'cliente'
);

relacionPadreHijo(
  Venta, DetalleVenta,
  'venta_id', 'detalles', 'venta'
);

relacionPadreHijo(
  Lote, DetalleVenta,
  'lote_id', 'detallesVenta', 'lote'
);

relacionPadreHijo(
  Lote, MovimientoInventario,
  'lote_id', 'movimientos', 'lote'
);

relacionPadreHijo(
  Usuario, MovimientoInventario,
  'usuario_id', 'movimientos', 'usuario'
);

relacionPadreHijo(
  Compra, MovimientoInventario,
  'compra_id', 'movimientos', 'compra'
);

relacionPadreHijo(
  Venta, MovimientoInventario,
  'venta_id', 'movimientos', 'venta'
);

relacionPadreHijo(
  Producto, Alerta,
  'producto_id', 'alertas', 'producto'
);

relacionPadreHijo(
  Lote, Alerta,
  'lote_id', 'alertas', 'lote'
);

module.exports = db;