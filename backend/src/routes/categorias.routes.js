const router = require('express').Router();
const { body, param } = require('express-validator');

const controller = require('../controllers/categorias.controller');
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
    body('nombre').isString().trim().isLength({ min: 2, max: 100 }),
    body('descripcion').optional({ nullable: true })
      .isString().isLength({ max: 2000 })
  ],
  validar,
  controller.crear
);

router.patch(
  '/:id',
  autorizar('ADMINISTRADOR'),
  [
    param('id').isInt({ min: 1 }),
    body('nombre').optional()
      .isString().trim().isLength({ min: 2, max: 100 }),
    body('descripcion').optional({ nullable: true })
      .isString().isLength({ max: 2000 }),
    body('activo').optional().isBoolean()
  ],
  validar,
  controller.actualizar
);

module.exports = router;