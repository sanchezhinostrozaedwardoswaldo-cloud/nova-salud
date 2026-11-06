'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes: D } = Sequelize;

    const id = {
      type: D.INTEGER,
      primaryKey: true,
      autoIncrement: true
    };

    const ref = (table, allowNull = false) => ({
      type: D.INTEGER,
      allowNull,
      references: { model: table, key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });

    const text = (size = 150, required = true) => ({
      type: D.STRING(size),
      allowNull: !required
    });

    const money = {
      type: D.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 0 }
    };

    const quantity = {
      type: D.INTEGER,
      allowNull: false,
      validate: { min: 0 }
    };

    const timestamps = {
      createdAt: {
        type: D.DATE,
        allowNull: false,
        defaultValue: D.NOW
      },
      updatedAt: {
        type: D.DATE,
        allowNull: false,
        defaultValue: D.NOW
      }
    };

    // 1. USUARIOS
    await queryInterface.createTable('usuarios', {
      id,
      nombre: text(),
      apellido: text(),
      correo: {
        ...text(180),
        unique: true
      },
      password_hash: text(255),
      rol: {
        type: D.ENUM('ADMINISTRADOR', 'VENDEDOR'),
        allowNull: false,
        defaultValue: 'VENDEDOR'
      },
      activo: {
        type: D.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      ...timestamps
    });

    // 2. CATEGORÍAS
    await queryInterface.createTable('categorias', {
      id,
      nombre: {
        ...text(100),
        unique: true
      },
      descripcion: {
        type: D.TEXT,
        allowNull: true
      },
      activo: {
        type: D.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      ...timestamps
    });

    // 3. PRODUCTOS
    await queryInterface.createTable('productos', {
      id,
      categoria_id: ref('categorias'),
      codigo: {
        ...text(50),
        unique: true
      },
      nombre: text(180),
      descripcion: {
        type: D.TEXT,
        allowNull: true
      },
      laboratorio: text(150, false),
      presentacion: text(100, false),
      precio_venta: money,
      stock_minimo: {
        ...quantity,
        defaultValue: 10
      },
      activo: {
        type: D.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      ...timestamps
    });

    // 4. PROVEEDORES
    await queryInterface.createTable('proveedores', {
      id,
      razon_social: text(180),
      ruc: {
        ...text(11),
        unique: true
      },
      telefono: text(20, false),
      correo: text(180, false),
      direccion: text(255, false),
      activo: {
        type: D.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      ...timestamps
    });

    // 5. CLIENTES
    await queryInterface.createTable('clientes', {
      id,
      nombre: text(150),
      apellido: text(150, false),
      tipo_documento: {
        type: D.ENUM('DNI', 'CE', 'RUC', 'OTRO'),
        allowNull: true
      },
      numero_documento: {
        ...text(20, false),
        unique: true
      },
      telefono: text(20, false),
      correo: text(180, false),
      ...timestamps
    });

    // 6. LOTES
    await queryInterface.createTable('lotes', {
      id,
      producto_id: ref('productos'),
      numero_lote: text(80),
      fecha_vencimiento: {
        type: D.DATEONLY,
        allowNull: false
      },
      stock_actual: {
        ...quantity,
        defaultValue: 0
      },
      precio_compra: money,
      ...timestamps
    });

    await queryInterface.addConstraint('lotes', {
      fields: ['producto_id', 'numero_lote'],
      type: 'unique',
      name: 'uq_lotes_producto_numero'
    });

    // 7. COMPRAS
    await queryInterface.createTable('compras', {
      id,
      proveedor_id: ref('proveedores'),
      usuario_id: ref('usuarios'),
      fecha: {
        type: D.DATE,
        defaultValue: D.NOW,
        allowNull: false
      },
      numero_documento: text(80, false),
      total: money,
      estado: {
        type: D.ENUM('REGISTRADA', 'ANULADA'),
        defaultValue: 'REGISTRADA',
        allowNull: false
      },
      ...timestamps
    });

    // 8. DETALLE DE COMPRAS
    await queryInterface.createTable('detalle_compras', {
      id,
      compra_id: ref('compras'),
      lote_id: ref('lotes'),
      cantidad: quantity,
      precio_unitario: money,
      subtotal: money,
      ...timestamps
    });

    // 9. VENTAS
    await queryInterface.createTable('ventas', {
      id,
      cliente_id: ref('clientes', true),
      usuario_id: ref('usuarios'),
      fecha: {
        type: D.DATE,
        defaultValue: D.NOW,
        allowNull: false
      },
      total: money,
      metodo_pago: {
        type: D.ENUM('EFECTIVO', 'YAPE', 'PLIN', 'TARJETA'),
        allowNull: false
      },
      estado: {
        type: D.ENUM('COMPLETADA', 'ANULADA'),
        defaultValue: 'COMPLETADA',
        allowNull: false
      },
      ...timestamps
    });

    // 10. DETALLE DE VENTAS
    await queryInterface.createTable('detalle_ventas', {
      id,
      venta_id: ref('ventas'),
      lote_id: ref('lotes'),
      cantidad: quantity,
      precio_unitario: money,
      subtotal: money,
      ...timestamps
    });

    // 11. MOVIMIENTOS DE INVENTARIO
    await queryInterface.createTable('movimientos_inventario', {
      id,
      lote_id: ref('lotes'),
      usuario_id: ref('usuarios'),
      tipo: {
        type: D.ENUM('ENTRADA', 'SALIDA', 'AJUSTE'),
        allowNull: false
      },
      cantidad: {
        type: D.INTEGER,
        allowNull: false
      },
      stock_anterior: quantity,
      stock_nuevo: quantity,
      motivo: {
        type: D.STRING(255),
        allowNull: false
      },
      compra_id: ref('compras', true),
      venta_id: ref('ventas', true),
      ...timestamps
    });

    // 12. ALERTAS
    await queryInterface.createTable('alertas', {
      id,
      producto_id: ref('productos'),
      lote_id: ref('lotes', true),
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
        allowNull: false,
        defaultValue: false
      },
      ...timestamps
    });

    // ÍNDICES
    await queryInterface.addIndex('productos', ['nombre']);
    await queryInterface.addIndex('lotes', ['producto_id']);
    await queryInterface.addIndex('lotes', ['fecha_vencimiento']);
    await queryInterface.addIndex('compras', ['fecha']);
    await queryInterface.addIndex('ventas', ['fecha']);
    await queryInterface.addIndex('movimientos_inventario', ['lote_id']);
    await queryInterface.addIndex('alertas', ['producto_id', 'tipo']);
  },

  async down(queryInterface) {
    const tables = [
      'alertas',
      'movimientos_inventario',
      'detalle_ventas',
      'ventas',
      'detalle_compras',
      'compras',
      'lotes',
      'clientes',
      'proveedores',
      'productos',
      'categorias',
      'usuarios'
    ];

    for (const table of tables) {
      await queryInterface.dropTable(table);
    }

    const enums = [
      'enum_usuarios_rol',
      'enum_clientes_tipo_documento',
      'enum_compras_estado',
      'enum_ventas_metodo_pago',
      'enum_ventas_estado',
      'enum_movimientos_inventario_tipo',
      'enum_alertas_tipo'
    ];

    for (const name of enums) {
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "${name}";`
      );
    }
  }
};