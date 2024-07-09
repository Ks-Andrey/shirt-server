require('dotenv').config();
const express = require('express');
const router = express.Router();
const { adminOrderRepository } = require('../repository/index');
const OrderController = require('../controllers/order.controller');

const orderController = new OrderController(adminOrderRepository)
router.get('/orders/:id', orderController.getOrders.bind(orderController));
router.get('/order/:id', orderController.getOrder.bind(orderController));
router.get('/user/orders/:id', orderController.getUserOrders.bind(orderController));
router.get('/statuses/', orderController.getOrderStatuses.bind(orderController));
router.get('/price', orderController.getPrice.bind(orderController));

router.post('/order', orderController.createOrder.bind(orderController));
router.post('/order/status', orderController.changeOrderStatus.bind(orderController));
router.post('/order/track', orderController.changeTrackNumber.bind(orderController));
router.post('/price', orderController.updatePrice.bind(orderController));

module.exports = router;
