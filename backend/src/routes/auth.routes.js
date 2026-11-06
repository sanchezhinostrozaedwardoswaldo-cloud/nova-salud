const router = require('express').Router();
const { body } = require('express-validator');

const controller = require('../controllers/auth.controller');
const validar = require('../middlewares/validate.middleware');
const { autenticar } = require('../middlewares/auth.middleware');

router.post(
  '/login',
  [
    body('correo').isEmail().withMessage('Correo inválido'),
    body('password').isString().notEmpty()
  ],
  validar,
  controller.login
);

router.get('/perfil', autenticar, controller.perfil);

module.exports = router;