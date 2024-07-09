class UserController {
    constructor(adminRepository){
        this.adminRepository = adminRepository;
    }

    async getUsers(req, res) {
        try {
            const allUsers = await this.adminRepository.getAllUsers();
            res.json(allUsers);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getUser(req, res) {
        const userId = req.params.id;
        try {
            const user = await this.adminRepository.getUserById(userId);
            res.json(user);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async authAdmin(req, res) {
        const {login, password} = req.body;

        try {
            const isAdmin = await this.adminRepository.authAdmin(login, password);

            isAdmin && res.json({ isAdmin });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = UserController;
