const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/database');

const options = (tableName) => ({
  tableName,
  timestamps: true,
  freezeTableName: true
});

const id = {
  type: D.INTEGER,
  primaryKey: true,
  autoIncrement: true
};

const fk = (allowNull = false) => ({
  type: D.INTEGER,
  allowNull
});

const str = (size = 150, allowNull = false) => ({
  type: D.STRING(size),
  allowNull
});

const money = () => ({
  type: D.DECIMAL(12, 2),
  allowNull: false
});

const qty = (defaultValue) => ({
  type: D.INTEGER,
  allowNull: false,
  ...(defaultValue !== undefined ? { defaultValue } : {})
});

const Usuario = sequelize.define('Usuario', {
  id,
  nombre: str(),
  apellido: str(),
  correo: { ...str(180), unique: true },
  password_hash: str(255),
  rol: {
    type: D.ENUM('ADMINISTRADOR', 'VENDEDOR'),
    defaultValue: 'VENDEDOR',
    allowNull: false
  },
  activo: {
    type: D.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, options('usuarios'));

const Categoria = sequelize.define('Categoria', {
  id,
  nombre: { ...str(100), unique: true },
  descripcion: { type: D.TEXT, allowNull: true },
  activo: {
    type: D.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, options('categorias'));

const Producto = sequelize.define('Producto', {
  id,
  categoria_id: fk(),
  codigo: { ...str(50), unique: true },
  nombre: str(180),
  descripcion: { type: D.TEXT, allowNull: true },
  laboratorio: str(150, true),
  presentacion: str(100, true),
  precio_venta: money(),
  stock_minimo: qty(10),
  activo: {
    type: D.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, options('productos'));

const Proveedor = sequelize.define('Proveedor', {
  id,
  razon_social: str(180),
  ruc: { ...str(11), unique: true },
  telefono: str(20, true),
  correo: str(180, true),
  direccion: str(255, true),
  activo: {
    type: D.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, options('proveedores'));

const Cliente = sequelize.define('Cliente', {
  id,
  nombre: str(),
  apellido: str(150, true),
  tipo_documento: {
    type: D.ENUM('DNI', 'CE', 'RUC', 'OTRO'),
    allowNull: true
  },
  numero_documento: {
    ...str(20, true),
    unique: true
  },
  telefono: str(20, true),
  correo: str(180, true)
}, options('clientes'));

const Lote = sequelize.define('Lote', {
  id,
  producto_id: fk(),
  numero_lote: str(80),
  fecha_vencimiento: {
    type: D.DATEONLY,
    allowNull: false
  },
  stock_actual: qty(0),
  precio_compra: money()
}, options('lotes'));

const Compra = sequelize.define('Compra', {
  id,
  proveedor_id: fk(),
  usuario_id: fk(),
  fecha: {
    type: D.DATE,
    defaultValue: D.NOW,
    allowNull: false
  },
  numero_documento: str(80, true),
  total: money(),
  estado: {
    type: D.ENUM('REGISTRADA', 'ANULADA'),
    defaultValue: 'REGISTRADA',
    allowNull: false
  }
}, options('compras'));

const DetalleCompra = sequelize.define('DetalleCompra', {
  id,
  compra_id: fk(),
  lote_id: fk(),
  cantidad: qty(),
  precio_unitario: money(),
  subtotal: money()
}, options('detalle_compras'));

const Venta = sequelize.define('Venta', {
  id,
  cliente_id: fk(true),
  usuario_id: fk(),
  fecha: {
    type: D.DATE,
    defaultValue: D.NOW,
    allowNull: false
  },
  total: money(),
  metodo_pago: {
    type: D.ENUM('EFECTIVO', 'YAPE', 'PLIN', 'TARJETA'),
    allowNull: false
  },
  estado: {
    type: D.ENUM('COMPLETADA', 'ANULADA'),
    defaultValue: 'COMPLETADA',
    allowNull: false
  }
}, options('ventas'));

const DetalleVenta = sequelize.define('DetalleVenta', {
  id,
  venta_id: fk(),
  lote_id: fk(),
  cantidad: qty(),
  precio_unitario: money(),
  subtotal: money()
}, options('detalle_ventas'));

const MovimientoInventario = sequelize.define('MovimientoInventario', {
  id,
  lote_id: fk(),
  usuario_id: fk(),
  tipo: {
    type: D.ENUM('ENTRADA', 'SALIDA', 'AJUSTE'),
    allowNull: false
  },
  cantidad: {
    type: D.INTEGER,
    allowNull: false
  },
  stock_anterior: qty(),
  stock_nuevo: qty(),
  motivo: str(255),
  compra_id: fk(true),
  venta_id: fk(true)
}, options('movimientos_inventario'));

const Alerta = sequelize.define('Alerta', {
  id,
  producto_id: fk(),
  lote_id: fk(true),
  tipo: {
    type: D.ENUM(
      'STOCK_BAJO',
      'PROXIMO_VENCIMIENTO',
      'VENCIDO'
    ),
    allowNull: false
  },
  mensaje: {
    type: D.TEXT,
    allowNull: false
  },
  leida: {
    type: D.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, options('alertas'));

module.exports = {
  sequelize,
  Usuario,
  Categoria,
  Producto,
  Proveedor,
  Cliente,
  Lote,
  Compra,
  DetalleCompra,
  Venta,
  DetalleVenta,
  MovimientoInventario,
  Alerta
};