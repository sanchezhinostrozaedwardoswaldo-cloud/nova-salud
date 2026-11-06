const router = require('express').Router();
const { body, param } = require('express-validator');

const controller = require('../controllers/proveedores.controller');
const validar = require('../middlewares/validate.middleware');

const {
  autenticar,
  autorizar
} = require('../middlewares/auth.middleware');

router.use(autenticar);

router.get('/', controller.listar);

router.post(
  '/',
  autorizar('ADMINISTRADOR'),
  [
    body('razon_social')
      .isString()
      .trim()
      .isLength({ min: 3, max: 180 }),

    body('ruc')
      .matches(/^\d{11}$/)
      .withMessage('El RUC debe tener 11 dígitos'),

    body('telefono')
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 30 }),

    body('correo')
      .optional({ values: 'falsy' })
      .isEmail(),

    body('direccion')
      .optional({ nullable: true })
      .isString()
  ],
  validar,
  controller.crear
);

router.patch(
  '/:id',
  autorizar('ADMINISTRADOR'),
  [
    param('id').isInt({ min: 1 }),

    body('razon_social')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 3, max: 180 }),

    body('ruc')
      .optional()
      .matches(/^\d{11}$/),

    body('telefono')
      .optional({ nullable: true })
      .isString(),

    body('correo')
      .optional({ values: 'falsy' })
      .isEmail(),

    body('direccion')
      .optional({ nullable: true })
      .isString(),

    body('activo')
      .optional()
      .isBoolean()
  ],
  validar,
  controller.actualizar
);

module.exports = router;