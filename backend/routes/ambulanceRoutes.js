const express = require('express');
const router = express.Router();
const ambulanceController = require('../controllers/ambulanceController');

// Ambulance
router.post('/ambulance/request', ambulanceController.requestAmbulance);
router.get('/ambulance/request/:id', ambulanceController.getRequest);
router.post('/ambulance/request/:id/cancel', ambulanceController.cancelRequest);
router.post('/ambulance/request/:id/assign', ambulanceController.assignRequest);
router.post('/ambulance/request/:id/en-route', ambulanceController.enRoute);
router.post('/ambulance/request/:id/arrived', ambulanceController.arrived);

// Location
router.post('/location/update', ambulanceController.updateLocation);
router.get('/location/:clientId', ambulanceController.getLocation);

module.exports = router;
