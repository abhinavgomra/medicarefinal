const express = require('express');
const router = express.Router();
const multer = require('multer');
const serviceController = require('../controllers/serviceController');
const { authMiddleware } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/prescriptions/ocr', authMiddleware, upload.single('file'), serviceController.ocrPrescription);
router.post('/voice/transcribe', authMiddleware, upload.single('file'), serviceController.transcribeVoice);
router.post('/verify/start', authMiddleware, serviceController.startVerify);
router.post('/verify/check', authMiddleware, serviceController.checkVerify);
router.post('/ai/health-assistant', authMiddleware, serviceController.healthAssistant);

module.exports = router;
