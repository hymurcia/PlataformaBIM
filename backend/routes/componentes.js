const express = require('express');
const router = express.Router();
const componentesController = require('../controllers/componentesController');

router.get('/', componentesController.getComponentes);
router.get('/:id', componentesController.getComponenteById);
router.post('/', componentesController.createComponente);

module.exports = router;
