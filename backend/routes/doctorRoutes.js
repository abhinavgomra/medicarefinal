const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

router.get('/', doctorController.getDoctors);
router.post('/', authMiddleware, adminOnly, doctorController.createDoctor);
router.put('/:id', authMiddleware, adminOnly, doctorController.updateDoctor);
router.delete('/:id', authMiddleware, adminOnly, doctorController.deleteDoctor);

module.exports = router;
