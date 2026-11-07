const router = require('express').Router();
const { query } = require('express-validator');

const controller = require('../controllers/reportes.controller');
const validar = require('../middlewares/validate.middleware');

const {
  autenticar,
  autorizar
} = require('../middlewares/auth.middleware');

router.use(autenticar);

// Los reportes financieros quedan reservados al administrador.
router.use(autorizar('ADMINISTRADOR'));

router.get(
  '/',
  [
    query('desde')
      .optional()
      .isISO8601({ strict: true }),

    query('hasta')
      .optional()
      .isISO8601({ strict: true })
  ],
  validar,
  controller.obtener
);

module.exports = router;