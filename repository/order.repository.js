class OrderRepository {
    constructor(client) {
        this.client = client
    }

    async getOrders(statusId) {
        try {
            const result = await this.client.query('SELECT * FROM get_orders($1)', [statusId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getOrder(orderId) {
        try {
            const result = await this.client.query('SELECT * FROM get_order($1)', [orderId]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    async createOrder(userId, address, color, size, front, font, printSize, imagePath, printText) {
        try {
            const result = await this.client.query('SELECT * FROM create_order($1, $2, $3, $4, $5, $6, $7, $8, $9)', [userId, address, color, size, front, font, printSize, imagePath, printText]);
            return result.rows[0].create_order;
        } catch (error) {
            throw error;
        }
    }
    
    async getUserOrders(userId) {
        try {
            const result = await this.client.query('SELECT * FROM get_orders_by_user($1)', [userId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async changeOrderStatus(orderId, statusId) {
        try {
            const result = await this.client.query('SELECT change_order_status($1, $2)', [orderId, statusId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async changeTrackNumber(orderId, trackNumber) {
        try {
            const result = await this.client.query('SELECT change_track_number($1, $2)', [orderId, trackNumber]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getOrderStatuses() {
        try {
            const result = await this.client.query('SELECT * FROM get_statuses()');
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getPrice() {
        try {
            const result = await this.client.query('SELECT * FROM get_latest_price()');
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    async updatePrice(price) {
        try {
            const result = await this.client.query('SELECT update_price($1)', [price]);
            return result.rows[0].update_price;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = OrderRepository;