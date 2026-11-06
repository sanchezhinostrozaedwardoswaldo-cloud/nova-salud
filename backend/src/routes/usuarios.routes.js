const router = require('express').Router();
const { body, param } = require('express-validator');

const controller = require('../controllers/usuarios.controller');
const validar = require('../middlewares/validate.middleware');
const {
  autenticar,
  autorizar
} = require('../middlewares/auth.middleware');

router.use(autenticar, autorizar('ADMINISTRADOR'));

router.get('/', controller.listar);

router.post(
  '/',
  [
    body('nombre').isString().trim().isLength({ min: 2, max: 150 }),
    body('apellido').isString().trim().isLength({ min: 2, max: 150 }),
    body('correo').isEmail(),
    body('password').isString().isLength({ min: 10, max: 128 })
      .withMessage('La contraseña debe tener entre 10 y 128 caracteres'),
    body('rol').isIn(['ADMINISTRADOR', 'VENDEDOR'])
  ],
  validar,
  controller.crear
);

router.patch(
  '/:id/estado',
  [
    param('id').isInt({ min: 1 }),
    body('activo').isBoolean()
  ],
  validar,
  controller.cambiarEstado
);

module.exports = router;