const router = require('express').Router();

const healthController = require('../controllers/health.controller');

const authRoutes = require('./auth.routes');
const usuariosRoutes = require('./usuarios.routes');
const categoriasRoutes = require('./categorias.routes');
const productosRoutes = require('./productos.routes');
const inventarioRoutes = require('./inventario.routes');
const proveedoresRoutes = require('./proveedores.routes');
const comprasRoutes = require('./compras.routes');
const clientesRoutes = require('./clientes.routes');
const ventasRoutes = require('./ventas.routes');

router.get('/health', healthController.getHealth);

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/categorias', categoriasRoutes);
router.use('/productos', productosRoutes);
router.use('/inventario', inventarioRoutes);
router.use('/proveedores', proveedoresRoutes);
router.use('/compras', comprasRoutes);
router.use('/clientes', clientesRoutes);
router.use('/ventas', ventasRoutes);

module.exports = router;