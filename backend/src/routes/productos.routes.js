const router = require('express').Router();
const { body, param, query } = require('express-validator');

const controller = require('../controllers/productos.controller');
const validar = require('../middlewares/validate.middleware');
const {
  autenticar,
  autorizar
} = require('../middlewares/auth.middleware');

router.use(autenticar);

const validacionesProducto = [
  body('codigo').isString().trim().isLength({ min: 2, max: 50 }),
  body('nombre').isString().trim().isLength({ min: 2, max: 180 }),
  body('categoria_id').isInt({ min: 1 }),
  body('precio_venta').isDecimal({ decimal_digits: '0,2' })
    .custom((v) => Number(v) >= 0),
  body('stock_minimo').isInt({ min: 0 }),
  body('descripcion').optional({ nullable: true }).isString(),
  body('laboratorio').optional({ nullable: true })
    .isString().isLength({ max: 150 }),
  body('presentacion').optional({ nullable: true })
    .isString().isLength({ max: 100 })
];

router.get('/', controller.listar);

router.get(
  '/:id',
  [param('id').isInt({ min: 1 })],
  validar,
  controller.obtener
);

router.post(
  '/',
  autorizar('ADMINISTRADOR'),
  validacionesProducto,
  validar,
  controller.crear
);

router.patch(
  '/:id',
  autorizar('ADMINISTRADOR'),
  [
    param('id').isInt({ min: 1 }),
    ...validacionesProducto.map((validation) =>
      validation.optional()
    ),
    body('activo').optional().isBoolean()
  ],
  validar,
  controller.actualizar
);

module.exports = router;