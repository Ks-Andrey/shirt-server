class ShirtRepository{
    constructor(client) {
        this.client = client
    }
    
    async getSizes() {
        try {
            const result = await this.client.query('SELECT * FROM get_sizes()');
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getSizeById(id) {
        try {
            const result = await this.client.query('SELECT * FROM get_size($1)', [id]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }
    
    async getFonts() {
        try {
            const result = await this.client.query('SELECT * FROM get_fonts()');
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getFontById(id) {
        try {
            const result = await this.client.query('SELECT * FROM get_font($1)', [id]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    async getColors() {
        try {
            const result = await this.client.query('SELECT * FROM get_colors()');
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getColorById(id) {
        try {
            const result = await this.client.query('SELECT * FROM get_color($1)', [id]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    async getPrintSizes() {
        try {
            const result = await this.client.query('SELECT * FROM get_print_sizes()');
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getPrintSizeById(id) {
        try {
            const result = await this.client.query('SELECT * FROM get_print_size($1)', [id]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }
}

module.exports = ShirtRepository;