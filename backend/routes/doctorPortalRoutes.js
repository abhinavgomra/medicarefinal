const express = require('express');
const router = express.Router();
const doctorPortalController = require('../controllers/doctorPortalController');
const { authMiddleware, doctorOnly } = require('../middleware/authMiddleware');

router.get('/dashboard', authMiddleware, doctorOnly, doctorPortalController.getDashboard);
router.get('/patients/:patientEmail', authMiddleware, doctorOnly, doctorPortalController.getPatientRecord);
router.put('/profile', authMiddleware, doctorOnly, doctorPortalController.updateProfile);

module.exports = router;
