
const router = require('express').Router();
const { body, param, query } = require('express-validator');

const controller = require(
  '../controllers/operaciones-inventario.controller'
);

const validar = require('../middlewares/validate.middleware');

const {
  autenticar,
  autorizar
} = require('../middlewares/auth.middleware');

router.use(autenticar);
router.use(autorizar('ADMINISTRADOR'));

const validarMotivo = body('motivo')
  .isString()
  .trim()
  .isLength({ min: 10, max: 180 });

router.post(
  '/ajustes',
  [
    body('lote_id').isInt({ min: 1 }),
    body('stock_nuevo').isInt({
      min: 0,
      max: 2147483647
    }),
    validarMotivo
  ],
  validar,
  controller.ajustar
);

router.post(
  '/ventas/:id/anular',
  [
    param('id').isInt({ min: 1 }),
    validarMotivo
  ],
  validar,
  controller.anularVenta
);

router.post(
  '/compras/:id/anular',
  [
    param('id').isInt({ min: 1 }),
    validarMotivo
  ],
  validar,
  controller.anularCompra
);

router.get(
  '/auditoria',
  [
    query('lote_id').optional().isInt({ min: 1 }),
    query('limite').optional().isInt({
      min: 1,
      max: 100
    }),
    query('pagina').optional().isInt({
      min: 1,
      max: 10000
    })
  ],
  validar,
  controller.auditoria
);

module.exports = router;
