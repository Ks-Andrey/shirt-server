require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const bot = require('./utils/bot');

const userRouter = require('./routers/user.router');
const orderRouter = require('./routers/order.router');
const UserHandler = require('./handlers/user.handler');
const { userOrderRepository, userRepository, userShirtRepository } = require('./repository');

const app = express();

const port = process.env.PORT || 3000;
const paymentToken = process.env.PAYMENT_TOKEN;

const userHandler = new UserHandler(bot, userShirtRepository, userOrderRepository, userRepository, paymentToken) 

bot.onText(/\/start/, msg => userHandler.startMessage(msg.chat.id));
bot.onText(/Сделать заказ/, msg => userHandler.createOrder(msg.chat.id));
bot.onText(/Инструкция/, msg => userHandler.sendInstruction(msg.chat.id));
bot.onText(/Оптовый заказ/, msg => userHandler.sendManager(msg.chat.id));
bot.onText(/Статус заказов/, msg => userHandler.sendOrdersStatuses(msg.chat.id));


app.use(fileUpload());
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'build')));
app.use('/upload', express.static(path.join(__dirname, 'upload')));

app.use('/api', userRouter);
app.use('/api', orderRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
