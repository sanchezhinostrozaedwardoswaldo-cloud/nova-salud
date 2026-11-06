'use strict';

module.exports = {
  async up(queryInterface) {
    const checks = [
      ['productos', 'precio_venta >= 0', 'chk_producto_precio'],
      ['productos', 'stock_minimo >= 0', 'chk_producto_stock_minimo'],
      ['lotes', 'stock_actual >= 0', 'chk_lote_stock'],
      ['lotes', 'precio_compra >= 0', 'chk_lote_precio'],
      ['compras', 'total >= 0', 'chk_compra_total'],
      ['ventas', 'total >= 0', 'chk_venta_total'],
      ['detalle_compras', 'cantidad > 0', 'chk_detalle_compra_cantidad'],
      ['detalle_ventas', 'cantidad > 0', 'chk_detalle_venta_cantidad'],
      ['detalle_compras', 'precio_unitario >= 0', 'chk_detalle_compra_precio'],
      ['detalle_ventas', 'precio_unitario >= 0', 'chk_detalle_venta_precio'],
      ['detalle_compras', 'subtotal >= 0', 'chk_detalle_compra_subtotal'],
      ['detalle_ventas', 'subtotal >= 0', 'chk_detalle_venta_subtotal'],
      ['movimientos_inventario', 'cantidad <> 0', 'chk_movimiento_cantidad'],
      ['movimientos_inventario', 'stock_anterior >= 0', 'chk_movimiento_anterior'],
      ['movimientos_inventario', 'stock_nuevo >= 0', 'chk_movimiento_nuevo']
    ];

    for (const [table, condition, name] of checks) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "${table}"
         ADD CONSTRAINT "${name}" CHECK (${condition});`
      );
    }
  },

  async down(queryInterface) {
    const constraints = [
      ['productos', 'chk_producto_precio'],
      ['productos', 'chk_producto_stock_minimo'],
      ['lotes', 'chk_lote_stock'],
      ['lotes', 'chk_lote_precio'],
      ['compras', 'chk_compra_total'],
      ['ventas', 'chk_venta_total'],
      ['detalle_compras', 'chk_detalle_compra_cantidad'],
      ['detalle_ventas', 'chk_detalle_venta_cantidad'],
      ['detalle_compras', 'chk_detalle_compra_precio'],
      ['detalle_ventas', 'chk_detalle_venta_precio'],
      ['detalle_compras', 'chk_detalle_compra_subtotal'],
      ['detalle_ventas', 'chk_detalle_venta_subtotal'],
      ['movimientos_inventario', 'chk_movimiento_cantidad'],
      ['movimientos_inventario', 'chk_movimiento_anterior'],
      ['movimientos_inventario', 'chk_movimiento_nuevo']
    ];

    for (const [table, name] of constraints) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${name}";`
      );
    }
  }
};