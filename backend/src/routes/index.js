const router = require('express').Router();

const healthController = require('../controllers/health.controller');
const databaseController = require('../controllers/database.controller');

router.get('/health', healthController.getHealth);
router.get('/database', databaseController.getDatabaseStatus);

module.exports = router;