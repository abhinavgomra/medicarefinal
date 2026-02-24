const express = require('express');
const router = express.Router();
const pharmacyController = require('../controllers/pharmacyController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

// Products
router.get('/products', pharmacyController.getProducts);
router.get('/admin/products', authMiddleware, adminOnly, pharmacyController.getAdminProducts);
router.post('/products', authMiddleware, adminOnly, pharmacyController.createProduct);
router.put('/products/:id', authMiddleware, adminOnly, pharmacyController.updateProduct);

// Orders
router.get('/orders', authMiddleware, pharmacyController.getOrders);
router.post('/orders', authMiddleware, pharmacyController.createOrder);
router.post('/orders/:id/cancel', authMiddleware, pharmacyController.cancelOrder);
router.put('/orders/:id/status', authMiddleware, adminOnly, pharmacyController.updateOrderStatus);

module.exports = router;
