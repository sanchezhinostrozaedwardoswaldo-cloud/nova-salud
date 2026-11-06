const router = require('express').Router();
const { body, param } = require('express-validator');

const controller = require('../controllers/ventas.controller');
const validar = require('../middlewares/validate.middleware');

const {
  autenticar,
  autorizar
} = require('../middlewares/auth.middleware');

router.use(autenticar);

router.get('/', controller.listar);

router.get(
  '/:id',
  [param('id').isInt({ min: 1 })],
  validar,
  controller.obtener
);

router.post(
  '/',
  autorizar('ADMINISTRADOR', 'VENDEDOR'),
  [
    body('cliente_id')
      .optional({ nullable: true, values: 'falsy' })
      .isInt({ min: 1 }),

    body('metodo_pago')
      .isIn(['EFECTIVO', 'YAPE', 'PLIN', 'TARJETA']),

    body('detalles')
      .isArray({ min: 1, max: 100 }),

    body('detalles.*.producto_id')
      .isInt({ min: 1 }),

    body('detalles.*.cantidad')
      .isInt({ min: 1, max: 1000000 })
  ],
  validar,
  controller.crear
);

module.exports = router;