const fs = require('fs');
const path = require('path');

class UserHandler {
    constructor(bot, shirtRepository, orderRepository, userRepository, paymentToken) {
        this.bot = bot;

        this.paymentToken = paymentToken;

        this.shirtRepository = shirtRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;

        this.userData = {};

        this.keyboardHandler = this.keyboardHandler.bind(this);
        this.messageHandler = this.messageHandler.bind(this);
        this.invoiceHandler = this.invoiceHandler.bind(this);

        this.bot.on('callback_query', this.keyboardHandler);
        this.bot.on('message', this.messageHandler);
        this.bot.on('pre_checkout_query', this.invoiceHandler);
        this.bot.on('successful_payment', ctx => this.handleSuccessfulPayment(ctx.chat.id))
    }

    async keyboardHandler(callbackQuery) {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;
        const messageId = callbackQuery.message.message_id;

        try {
            if (data.startsWith('color_')) {
                await this.processSizeSelection(chatId, data, messageId);
            } else if (data.startsWith('size_')) {
                await this.processOrientationSelection(chatId, data, messageId);
            } else if (data == 'back' || data == 'front') {
                await this.processTypeSelection(chatId, data, messageId);
            } else if (data == 'image') {
                await this.processSizePrintSelection(chatId, data, messageId);
            } else if (data == 'text') {
                await this.processFontSelection(chatId, data, messageId);
            } else if (data.startsWith('printSize_')) {
                await this.processImageSelection(chatId, data, messageId);
            } else if (data.startsWith('fontSize_')) {
                await this.processTextSelection(chatId, data, messageId);
            }
            //  else if (data == 'ok') {
            //     await this.acceptOrder(chatId);
            // } else if (data == 'not_ok') {
            //     this.bot.sendMessage(chatId, 'Пожалуйста, свяжитесь с нашим поддержкой @andrey_ksa.');
            //     delete this.userData[chatId];
            // }

            await this.bot.answerCallbackQuery(callbackQuery.id);
        } catch (error) {
            console.error(error);
            this.bot.sendMessage(chatId, 'Ошибка работы бота!');
        }
    }

    async messageHandler(msg) {
        const chatId = msg.chat.id;
    
        try {
            if (msg.photo && this.userData[chatId] && this.userData[chatId].awaitingImage) {
                const fileId = msg.photo[msg.photo.length - 1].file_id;
                const filePath = await this.bot.getFile(fileId);
                const fileUrl = `https://api.telegram.org/file/bot${this.bot.token}/${filePath.file_path}`;
                const savePath = path.resolve(__dirname, '../upload', `${fileId}.jpg`);
    
                const response = await fetch(fileUrl);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
    
                fs.writeFile(savePath, buffer, (err) => {
                    if (err) {
                        console.error('Error saving image:', err);
                    }
                });
    
                if (!this.userData[chatId]) {
                    await this.checkStart(chatId);
                    return;
                }
    
                this.userData[chatId].imagePath = `../upload/${fileId}.jpg`;
    
                await this.bot.deleteMessage(chatId, msg.message_id);
                try { await this.bot.deleteMessage(chatId, this.userData[chatId].awaitingImage); } catch {}
                delete this.userData[chatId].awaitingImage;
    
                this.processPhoneWrite(chatId);
            } else if (msg.text) {
                if (this.userData[chatId] && this.userData[chatId].awaitingText) {
                    this.userData[chatId].text = msg.text;
    
                    await this.bot.deleteMessage(chatId, msg.message_id);
                    try { await this.bot.deleteMessage(chatId, this.userData[chatId].awaitingText); } catch {}
                    delete this.userData[chatId].awaitingText;
    
                    this.processPhoneWrite(chatId);
                }
    
                if (this.userData[chatId] && this.userData[chatId].awaitingPhone) {
                    await this.userRepository.addUser(chatId, msg.from.username, msg.text);
                    
                    await this.bot.deleteMessage(chatId, msg.message_id);
                    try { await this.bot.deleteMessage(chatId, this.userData[chatId].awaitingPhone); } catch {}
                    delete this.userData[chatId].awaitingPhone;
    
                    this.processAddressWrite(chatId);
                }
    
                if (this.userData[chatId] && this.userData[chatId].awaitingAddress) {
                    this.userData[chatId].address = msg.text;
    
                    await this.bot.deleteMessage(chatId, msg.message_id);
                    try { await this.bot.deleteMessage(chatId, this.userData[chatId].awaitingAddress); } catch {}
                    delete this.userData[chatId].awaitingAddress;
    
                    this.processPayment(chatId);
                }
    
                if (this.userData[chatId] && this.userData[chatId].awaitingImage) {
                    await this.bot.deleteMessage(chatId, msg.message_id);
                }
            }
        } catch (error) {
            console.error('Error handling message:', error);
            this.bot.sendMessage(chatId, 'Произошла ошибка при обработке сообщения. Пожалуйста, попробуйте снова позже.');
        }
    }    

    async invoiceHandler(preCheckoutQuery) {
        this.bot.answerPreCheckoutQuery(preCheckoutQuery.id, true);
    }

    startMessage(chatId) {
        delete this.userData[chatId];

        this.bot.sendPhoto(chatId, './images/start.jpg', {
            caption: 'Добро пожаловать в бота!',
            reply_markup: {
                keyboard: [
                    ['Сделать заказ'],
                    ['Статус заказов'],
                    ['Оптовый заказ'],
                    ['Инструкция']
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    }

    async sendOrdersStatuses(chatId) {
        try {
            delete this.userData[chatId];

            const user = await this.userRepository.getUserById(chatId);

            if (user.length === 0) {
                this.bot.sendMessage(chatId, 'Вы еще не создавали заказ.');
                return;
            }

            const userOrders = await this.orderRepository.getUserOrders(chatId);

            if (userOrders.length === 0) {
                this.bot.sendMessage(chatId, 'У вас пока нет заказов.');
                return;
            }

            let message = 'Ваши заказы:\n\n';
            for (const order of userOrders) {
                message += `ID заказа: ${order.id}\n`;
                message += `Статус: ${order.status}\n`;
                message += `Трек номер: ${order.track_number ?? 'не установлен'}\n\n`
            }

            this.bot.sendMessage(chatId, message);
        } catch (error) {
            console.error('Error fetching orders:', error);
            this.bot.sendMessage(chatId, 'Произошла ошибка при получении заказов. Пожалуйста, попробуйте снова позже.');
        }
    }
    
    async checkStart(chatId) {
        await this.bot.sendMessage(chatId, 'Для полного оформления заказа начните сначала!');
        delete this.userData[chatId];
        await this.createOrder(chatId);
    }

    async sendInstruction(chatId) {
        delete this.userData[chatId];

        this.bot.sendVideo(chatId, './images/instruction.mp4', {
            caption: 'Видеоинструкция по боту'
        })
    }

    async sendManager(chatId) {
        delete this.userData[chatId];

        this.bot.sendMessage(chatId, 'По вопросам оптовых заказов, пожалуйста, свяжитесь с @andrey_ksa.');
    }

    async createOrder(chatId) {
        try {
            this.userData[chatId] = {};

            const colors = await this.shirtRepository.getColors();

            const colorButtons = colors.map(color => ({ text: color.color, callback_data: `color_${color.id}` }));
            
            const colorKeyboard = [];
            for (let i = 0; i < colorButtons.length; i += 4) {
                colorKeyboard.push(colorButtons.slice(i, i + 4));
            }

            this.bot.sendPhoto(chatId, './images/color.jpg', {
                caption: 'Выберите цвет футболки: ',
                reply_markup: {
                    inline_keyboard: colorKeyboard
                }
            });
        } catch (error) {
            console.error('Error creating order:', error);
            this.bot.sendMessage(chatId, 'Произошла ошибка при создании заказа. Пожалуйста, попробуйте снова позже.');
        }
    }

    async processSizeSelection(chatId, data, messageId) {
        try {
            const colorId = data.split('_')[1];

            if (!this.userData[chatId]) {
                await this.checkStart(chatId);
                return;
            }
            this.userData[chatId].colorId = colorId;

            const sizes = await this.shirtRepository.getSizes();

            const sizeButtons = sizes.map(size => ({ text: size.size, callback_data: `size_${size.id}` }));

            const sizeKeyboard = [];
            for (let i = 0; i < sizeButtons.length; i += 4) {
                sizeKeyboard.push(sizeButtons.slice(i, i + 4));
            }

            await this.bot.deleteMessage(chatId, messageId);
            await this.bot.sendPhoto(chatId, './images/shirt_sizes.jpg', {
                caption: 'Выберите размер футболки: ',
                reply_markup: {
                    inline_keyboard: sizeKeyboard
                }
            });
        } catch (error) {
            console.error('Error creating order:', error);
            this.bot.sendMessage(chatId, 'Произошла ошибка при создании заказа. Пожалуйста, попробуйте снова позже.');
        }
    }

    async processOrientationSelection(chatId, data, messageId) {
        try {
            const sizeId = data.split('_')[1];

            if (!this.userData[chatId]) {
                await this.checkStart(chatId);
                return;
            }
            this.userData[chatId].sizeId = sizeId;

            await this.bot.deleteMessage(chatId, messageId);
            await this.bot.sendPhoto(chatId, `./images/position_${this.userData[chatId].colorId}.jpg`, {
                caption: 'Где печатать?',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Спина', callback_data: 'back' }, { text: 'Грудь', callback_data: 'front' }]
                    ]
                }
            });
        } catch (error) {
            console.error('Error processing size selection:', error);
            this.bot.sendMessage(chatId, 'Ошибка выбора размера. Пожалуйста, попробуйте снова позже.');
        }
    }

    async processTypeSelection(chatId, data, messageId) {
        try {
            if (!this.userData[chatId]) {
                await this.checkStart(chatId);
                return;
            }
            this.userData[chatId].printSide = data;

            const colorId = this.userData[chatId].colorId;

            this.bot.deleteMessage(chatId, messageId);
            this.bot.sendPhoto(chatId, `./images/print_${colorId}_${data}.jpg`, {
                caption: 'Что будем печатать?',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Изображение', callback_data: 'image' }, { text: 'Надпись', callback_data: 'text' }]
                    ]
                }
            });
        } catch (error) {
            this.bot.sendMessage(chatId, 'Ошибка выбора типа печати!');
        }
    }

    async processSizePrintSelection(chatId, data, messageId) {
        try {
            const sizes = await this.shirtRepository.getPrintSizes();

            const printSizeButtons = sizes.map(printSize => ({ text: printSize.size, callback_data: `printSize_${printSize.id}` }));

            const printSizeKeyboard = [];
            for (let i = 0; i < printSizeButtons.length; i += 4) {
                printSizeKeyboard.push(printSizeButtons.slice(i, i + 4));
            }

            this.bot.deleteMessage(chatId, messageId);
            this.bot.sendPhoto(chatId, './images/print_size.jpg', {
                caption: 'Выберите размер принта:',
                reply_markup: {
                    inline_keyboard: printSizeKeyboard
                }
            });
        } catch (error) {
            console.error('Error creating order:', error);
            this.bot.sendMessage(chatId, 'Произошла ошибка при создании заказа. Пожалуйста, попробуйте снова позже.');
        }
    }

    async processFontSelection(chatId, data, messageId) {
        try {
            const sizes = await this.shirtRepository.getFonts();

            const fontSizeButtons = sizes.map(fontSize => ({ text: fontSize.id, callback_data: `fontSize_${fontSize.id}` }));

            const fontSizeKeyboard = [];
            for (let i = 0; i < fontSizeButtons.length; i += 4) {
                fontSizeKeyboard.push(fontSizeButtons.slice(i, i + 4));
            }

            await this.bot.deleteMessage(chatId, messageId);
            await this.bot.sendPhoto(chatId, './images/fonts_types.jpg', {
                caption: 'Выберите шрифт:',
                reply_markup: {
                    inline_keyboard: fontSizeKeyboard
                }
            });
        } catch (error) {
            console.error('Error creating order:', error);
            this.bot.sendMessage(chatId, 'Произошла ошибка при создании заказа. Пожалуйста, попробуйте снова позже.');
        }
    }

    async processImageSelection(chatId, data, messageId) {
        try {
            const printSizeId = data.split('_')[1];

            if (!this.userData[chatId]) {
                await this.checkStart(chatId);
                return;
            }
            this.userData[chatId].printSizeId = printSizeId;

            await this.bot.deleteMessage(chatId, messageId);
            const message = await this.bot.sendMessage(chatId, 'Пожалуйста, отправьте изображение для печати.');

            this.userData[chatId].awaitingImage = message.message_id;
        } catch (error) {
            console.error('Error handling print size selection:', error);
            this.bot.sendMessage(chatId, 'Произошла ошибка при выборе размера принта. Пожалуйста, попробуйте снова позже.');
        }
    }

    async processTextSelection(chatId, data, messageId) {
        try {
            const fontId = data.split('_')[1];

            if (!this.userData[chatId]) {
                await this.checkStart(chatId);
                return;
            }
            this.userData[chatId].fontId = fontId;

            const message = await this.bot.sendMessage(chatId, 'Пожалуйста, отправьте текст для печати.');

            this.userData[chatId].awaitingText = message.message_id;

            await this.bot.deleteMessage(chatId, messageId);
        } catch (error) {
            console.error('Error handling font size selection:', error);
            this.bot.sendMessage(chatId, 'Произошла ошибка при выборе размера шрифта. Пожалуйста, попробуйте снова позже.');
        }
    }

    async processPhoneWrite(chatId) {
        try {
            const user = await this.userRepository.getUserById(chatId);

            if (user.length === 0) {
                if (!this.userData[chatId]) {
                    await this.checkStart(chatId);
                    return;
                }

                const message = await this.bot.sendMessage(chatId, 'Введите номер телефона');

                this.userData[chatId].awaitingPhone = message.message_id;
            } else {
                await this.processAddressWrite(chatId);
            }
        } catch (error) {
            console.error('Error handling font size selection:', error);
            this.bot.sendMessage(chatId, 'Произошла ошибка при вводе номера телефона!');
        }
    }

    async processAddressWrite(chatId) {
        try {
            if (!this.userData[chatId]) {
                await this.checkStart(chatId);
                return;
            }
            
            const message = await this.bot.sendMessage(chatId, `Напишите ваш адрес в формате
Город:
Улица:
Дом: `);

            this.userData[chatId].awaitingAddress = message.message_id;

        } catch (error) {
            console.error('Error handling font size selection:', error);
            this.bot.sendMessage(chatId, 'Произошла ошибка при вводе адреса!');
        }
    }

    // async showFinalMaket(chatId) {
    //     try {
    //         const userOrder = this.userData[chatId];
    //         if (!userOrder) {
    //             this.bot.sendMessage(chatId, 'Произошла ошибка при создании макета. Пожалуйста, попробуйте снова позже.');
    //             return;
    //         }

    //         const color = await this.shirtRepository.getColorById(userOrder.colorId);
    //         const size = await this.shirtRepository.getSizeById(userOrder.sizeId);
    //         const printSize = userOrder.printSizeId ? await this.shirtRepository.getPrintSizeById(userOrder.printSizeId) : null;
    //         const font = userOrder.fontId ? await this.shirtRepository.getFontById(userOrder.fontId) : null;

    //         let finalMessage = `Ваш заказ:\n`;
    //         finalMessage += `Цвет: ${color.color}\n`;
    //         finalMessage += `Размер: ${size.size}\n`;
    //         finalMessage += `Печать на: ${userOrder.printSide === 'back' ? 'Спина' : 'Грудь'}\n`;

    //         if (userOrder.printSizeId) {
    //             finalMessage += `Размер принта: ${printSize.size}\n`;
    //         }

    //         if (userOrder.fontId) {
    //             finalMessage += `Шрифт: ${font.font}\n`;
    //             finalMessage += `Текст: ${userOrder.text}\n`;
    //         }

    //         finalMessage += `Адрес доставки: ${userOrder.address}\n`;

    //         const options = {
    //             reply_markup: {
    //                 inline_keyboard: [
    //                     [{ text: 'Ок', callback_data: 'ok' }, { text: 'Не ок', callback_data: 'not_ok' }]
    //                 ]
    //             }
    //         };

    //         this.userData[chatId].finalMessage = finalMessage;
            
    //         const message = await this.bot.sendPhoto(chatId, `./images/order_${userOrder.colorId}_${userOrder.printSide}.jpg`, {
    //             caption: finalMessage,
    //             ...options
    //         });
    //         this.userData[chatId].finalMessageId = message.message_id;
    //     } catch (error) {
    //         console.error('Error showing final maket:', error);
    //         this.bot.sendMessage(chatId, 'Произошла ошибка при создании макета. Пожалуйста, попробуйте снова позже.');
    //     }
    // }

    async acceptOrder(chatId){
        try {
            const userOrder = this.userData[chatId];
            if (!userOrder) {
                this.bot.sendMessage(chatId, 'Произошла ошибка при создании макета. Пожалуйста, попробуйте снова позже.');
                return;
            }

            const orderId = await this.orderRepository.createOrder(
                chatId,
                userOrder.address,
                userOrder.colorId,
                userOrder.sizeId,
                userOrder.printSide,
                userOrder.fontId,
                userOrder.printSizeId,
                userOrder.imagePath,
                userOrder.text
            );

            // await this.bot.editMessageCaption(userOrder.finalMessage, {
            //     chat_id: chatId,
            //     message_id: userOrder.finalMessageId,
            //     reply_markup: {
            //         inline_keyboard: [
            //             [{ text: 'Поддержка', url: 'https://t.me/andrey_ksa' }]
            //         ]
            //     }
            // })

            await this.bot.sendPhoto(chatId, './images/success.jpg', {
                caption: `Заказ оформлен! Номер заказа: ${orderId}
В ближайшее время менеджер свяжется с вами для подтверждении макета!`
            });
            
            delete this.userData[chatId];
        } catch (error) {
            console.error('Error showing final maket:', error);
            this.bot.sendMessage(chatId, 'Произошла ошибка при создании заказа. Пожалуйста, попробуйте снова позже.');
        }
    }

    async processPayment(chatId) {
        try {
            const userOrder = this.userData[chatId];
            if (!userOrder) {
                this.bot.sendMessage(chatId, 'Произошла ошибка при создании заказа. Пожалуйста, попробуйте снова позже.');
                return;
            }

            const { price } = await this.orderRepository.getPrice();
            
            await this.bot.sendPhoto(chatId, './images/wait.jpg');
            const message = await this.bot.sendInvoice(chatId,
                'Оплата заказа',
                'Оплата вашего заказа на печать футболки',
                'order_payload',
                this.paymentToken,
                'RUB',
                [
                    { label: 'Цена', amount: +price }
                ]);

            this.userData[chatId].paymentMessageId = message.message_id;
        } catch (error) {
            console.error('Error processing payment:', error);
            this.bot.sendMessage(chatId, 'Произошла ошибка при создании оплаты. Пожалуйста, попробуйте снова позже.');
        }
    }

    async handleSuccessfulPayment(chatId) {
        try {
            const userOrder = this.userData[chatId];
            if (!userOrder) {
                this.bot.sendMessage(chatId, 'Произошла ошибка при создании заказа. Пожалуйста, попробуйте снова позже.');
                return;
            }

            if (userOrder.paymentMessageId) {
                await this.bot.deleteMessage(chatId, userOrder.paymentMessageId - 1);
                await this.bot.deleteMessage(chatId, userOrder.paymentMessageId);
            }

            await this.acceptOrder(chatId);
        } catch (error) {
            console.error('Error handling successful payment:', error);
            this.bot.sendMessage(chatId, 'Произошла ошибка при создании заказа. Пожалуйста, попробуйте снова позже.');
        }
    }
}

module.exports = UserHandler;
