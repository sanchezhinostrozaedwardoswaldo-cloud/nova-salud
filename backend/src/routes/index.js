const router = require('express').Router();

const healthController = require('../controllers/health.controller');

const authRoutes = require('./auth.routes');
const usuariosRoutes = require('./usuarios.routes');
const categoriasRoutes = require('./categorias.routes');
const productosRoutes = require('./productos.routes');
const inventarioRoutes = require('./inventario.routes');

router.get('/health', healthController.getHealth);

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/categorias', categoriasRoutes);
router.use('/productos', productosRoutes);
router.use('/inventario', inventarioRoutes);

module.exports = router;