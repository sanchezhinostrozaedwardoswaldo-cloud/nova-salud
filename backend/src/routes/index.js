const router = require('express').Router();

const healthController = require('../controllers/health.controller');

const authRoutes = require('./auth.routes');
const usuariosRoutes = require('./usuarios.routes');

router.get('/health', healthController.getHealth);

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);

module.exports = router;