class UserRepository {
    constructor(client) {
        this.client = client;
    }

    async getAllUsers() {
        try {
            const result = await this.client.query('SELECT * FROM get_all_users()');
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async getUserById(userId) {
        try {
            const result = await this.client.query('SELECT * FROM get_user($1)', [userId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    async addUser(userId, name, phone) {
        try {
            const result = await this.client.query('SELECT add_user($1, $2, $3)', [userId, name, phone]);
            return result.rows[0].add_user;
        } catch (error) {
            throw error;
        }
    }

    async authAdmin(login, password) {
        try {
            const result = await this.client.query('SELECT auth_admin($1, $2)', [login, password]);
            return result.rows[0].auth_admin;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = UserRepository;
