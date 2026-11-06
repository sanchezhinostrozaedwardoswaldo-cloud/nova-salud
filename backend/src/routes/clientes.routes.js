const router = require('express').Router();
const { body, param } = require('express-validator');

const controller = require('../controllers/clientes.controller');
const validar = require('../middlewares/validate.middleware');

const {
  autenticar,
  autorizar
} = require('../middlewares/auth.middleware');

router.use(autenticar);

router.get('/', controller.listar);

const validarCliente = [
  body('nombre')
    .isString().trim().isLength({ min: 2, max: 120 }),

  body('apellido')
    .isString().trim().isLength({ min: 2, max: 120 }),

  body('tipo_documento')
    .isIn(['DNI', 'CE', 'RUC', 'OTRO']),

  body('numero_documento')
    .isString().trim().isLength({ min: 4, max: 30 }),

  body('telefono')
    .optional({ values: 'falsy' }).isString(),

  body('correo')
    .optional({ values: 'falsy' }).isEmail()
];

router.post(
  '/',
  autorizar('ADMINISTRADOR', 'VENDEDOR'),
  validarCliente,
  validar,
  controller.crear
);

router.patch(
  '/:id',
  autorizar('ADMINISTRADOR', 'VENDEDOR'),
  [
    param('id').isInt({ min: 1 }),
    ...validarCliente.map((regla) => regla.optional())
  ],
  validar,
  controller.actualizar
);

module.exports = router;