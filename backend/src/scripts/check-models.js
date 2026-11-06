const db = require('../models');

async function main() {
  try {
    await db.sequelize.authenticate();

    console.log('\nConexión con PostgreSQL establecida.\n');

    const modelos = [
      'Usuario',
      'Categoria',
      'Producto',
      'Proveedor',
      'Cliente',
      'Lote',
      'Compra',
      'DetalleCompra',
      'Venta',
      'DetalleVenta',
      'MovimientoInventario',
      'Alerta'
    ];

    for (const nombre of modelos) {
      const cantidad = await db[nombre].count();
      console.log(`${nombre}: ${cantidad} registros`);
    }

    console.log('\nLos 12 modelos funcionan correctamente.');
  } catch (error) {
    console.error('Error al verificar los modelos:', error);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

main();