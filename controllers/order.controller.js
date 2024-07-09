class OrderController {
    constructor(adminRepository){
        this.adminRepository = adminRepository;
    }

    async getOrderStatuses (req, res) {
        try {
            const orderStatuses = await this.adminRepository.getOrderStatuses();
            res.json(orderStatuses);
        } catch (error) {
            res.status(500).json({ error: error.message }); 
        }
    }

    async getOrders(req, res) {
        const statusId = req.params.id;

        try {
            const allOrders = await this.adminRepository.getOrders(statusId);
            res.json(allOrders);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getOrder(req, res) {
        const orderId = req.params.id;

        try {
            const order = await this.adminRepository.getOrder(orderId);
            res.json(order);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getUserOrders(req, res) {
        const userId = req.params.id;

        try {
            const orders = await this.adminRepository.getUserOrders(userId);
            res.json({ orders });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async createOrder(req, res) {
        const {
            userId,
            address,
            color,
            size,
            front,
            font,
            printSize,
            printText,
            imagePath
        } = req.body;

        try {
            const orderId = await this.adminRepository.createOrder(userId, address, color, size, front, font, printSize, imagePath, printText);
            res.json({ order_id: orderId });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async changeOrderStatus(req, res) {
        const { orderId, statusId } = req.body;

        try {
            await this.adminRepository.changeOrderStatus(orderId, statusId);
            res.json({ status: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async changeTrackNumber(req, res) {
        const { orderId, trackNumber } = req.body;

        try {
            await this.adminRepository.changeTrackNumber(orderId, trackNumber);
            res.json({ status: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getPrice(req, res) {
        try {
            const price = await this.adminRepository.getPrice();
            res.json({ price });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updatePrice(req, res) {
        const { price } = req.body;
        
        try {
            await this.adminRepository.updatePrice(price);
            res.json({ price });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = OrderController;
