const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const telemedicineController = require('../controllers/telemedicineController');

router.get('/ice-servers', authMiddleware, telemedicineController.getIceServers);
router.get('/appointments', authMiddleware, telemedicineController.getTelemedicineAppointments);
router.get('/appointments/:appointmentId/messages', authMiddleware, telemedicineController.getTelemedicineMessages);
router.post('/appointments/:appointmentId/messages', authMiddleware, telemedicineController.createTelemedicineMessage);

module.exports = router;
