const router = require('express').Router();
const { body, param } = require('express-validator');

const controller = require('../controllers/compras.controller');
const validar = require('../middlewares/validate.middleware');

const {
  autenticar,
  autorizar
} = require('../middlewares/auth.middleware');

router.use(autenticar);

router.get('/', controller.listar);
router.get('/movimientos', controller.movimientos);

router.get(
  '/:id',
  [param('id').isInt({ min: 1 })],
  validar,
  controller.obtener
);

router.post(
  '/',
  autorizar('ADMINISTRADOR'),
  [
    body('proveedor_id').isInt({ min: 1 }),
    body('numero_documento')
      .optional({ values: 'falsy' })
      .isString()
      .isLength({ max: 100 }),
    body('detalles').isArray({ min: 1, max: 100 }),
    body('detalles.*.producto_id').isInt({ min: 1 }),
    body('detalles.*.numero_lote')
      .isString().trim().isLength({ min: 1, max: 100 }),
    body('detalles.*.fecha_vencimiento').isISO8601({
      strict: true,
      strictSeparator: true
    }),
    body('detalles.*.cantidad').isInt({ min: 1, max: 1000000 }),
    body('detalles.*.precio_unitario')
      .isDecimal({ decimal_digits: '0,2' })
      .custom((v) => Number(v) >= 0)
  ],
  validar,
  controller.crear
);

module.exports = router;