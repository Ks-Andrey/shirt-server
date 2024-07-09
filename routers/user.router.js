require('dotenv').config();
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const { adminRepository } = require('../repository/index');

const userController = new UserController(adminRepository);

router.get('/users', userController.getUsers.bind(userController));
router.get('/user/:id', userController.getUser.bind(userController));
router.post('/auth', userController.authAdmin.bind(userController));

module.exports = router;
