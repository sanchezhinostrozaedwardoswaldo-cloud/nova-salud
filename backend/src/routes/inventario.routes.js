const router = require('express').Router();

const controller = require('../controllers/inventario.controller');
const { autenticar } = require('../middlewares/auth.middleware');

router.use(autenticar);

router.get('/resumen', controller.resumen);
router.get('/lotes', controller.listarLotes);

module.exports = router;