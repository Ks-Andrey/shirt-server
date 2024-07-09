require('dotenv').config();
const { Client } = require('pg');
const UserRepository = require('./user.repository');
const ShirtRepository = require('./shirt.repository');
const OrderRepository = require('./order.repository');

const userName = process.env.DB_USER;
const userPassword = process.env.DB_USER_PASSWORD;

const adminName = process.env.DB_ADMIN;
const adminPassword = process.env.DB_ADMIN_PASSWORD;

const host = process.env.DB_HOST;
const database = process.env.DB_NAME;

const admin = new Client({
    user: adminName,
    host: host,
    database: database,
    password: adminPassword,
    port: 5432,
    client_encoding: 'UTF8'
});

const user = new Client({
    user: userName,
    host: host,
    database: database,
    password: userPassword,
    port: 5432,
    client_encoding: 'UTF8'
});

user.connect();
admin.connect();

const userOrderRepository = new OrderRepository(user);
const userShirtRepository = new ShirtRepository(user);
const userRepository = new UserRepository(user);

const adminOrderRepository = new OrderRepository(admin);
const adminShirtRepository = new ShirtRepository(admin);
const adminRepository = new UserRepository(admin);

module.exports = {
    userOrderRepository,
    userShirtRepository,
    userRepository,
    adminOrderRepository,
    adminShirtRepository,
    adminRepository
}