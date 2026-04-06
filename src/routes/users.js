<<<<<<< HEAD
// User Routes
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const socketService = require('../services/socket');

// Middleware to attach broadcast function to request
router.use((req, res, next) => {
    req.broadcast = (event, data) => {
        socketService.broadcast(event, data);
    };
    next();
});

// GET /api/users - Get all users (admin only)
router.get('/', userController.getAllUsers);

// GET /api/users/:id - Get specific user
router.get('/:id', userController.getUser);

// POST /api/users - Create new user (admin only)
router.post('/', userController.createUser);

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', userController.deleteUser);

module.exports = router;
=======
const express = require('express');
const bcrypt  = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = function usersRoutes(db, broadcast) {
    const router = express.Router();

    // GET all users (admin only)
    router.get('/', (req, res) => {
        try {
            const { userRole } = req.query;
            if (userRole !== 'admin') {
                return res.status(403).json({ success: false, message: 'មានតែ Admin ទេដែលអាចមើលអ្នកប្រើប្រាស់ទាំងអស់!' });
            }
            const users = db.prepare('SELECT id, username, fullname, role, permissions, createdAt, active FROM users').all();
            res.json({ success: true, users });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // GET single user
    router.get('/:id', (req, res) => {
        try {
            const { userRole, userId } = req.query;
            const user = db.prepare('SELECT id, username, fullname, role, permissions, createdAt, active FROM users WHERE id = ?').get(req.params.id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            if (userRole !== 'admin' && req.params.id !== userId) {
                return res.status(403).json({ success: false, message: 'អ្នកមិនមានសិទ្ធិមើលអ្នកប្រើប្រាស់នេះទេ!' });
            }
            res.json({ success: true, user });
        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // POST create user (admin only)
    router.post('/', (req, res) => {
        try {
            const { username, password, fullname, role, permissions, userRole } = req.body;

            if (userRole !== 'admin') {
                return res.status(403).json({ success: false, message: 'មានតែ Admin ទេដែលអាចបង្កើតអ្នកប្រើប្រាស់!' });
            }

            const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
            if (existing) {
                return res.status(400).json({ success: false, message: 'ឈ្មោះអ្នកប្រើប្រាស់មានរួចហើយ!' });
            }

            if (role === 'admin') {
                const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();
                if (adminCount.count > 0) {
                    return res.status(400).json({ success: false, message: 'មានតែ Admin មួយគត់ដែលអាចមានក្នុងប្រព័ន្ធ!' });
                }
            }

            const hashedPassword = bcrypt.hashSync(password, 10);
            const id = uuidv4();
            const createdAt = new Date().toISOString();
            const finalPermissions = role === 'admin'
                ? ['pos', 'items', 'orders', 'reports', 'users']
                : (permissions || []);

            db.prepare(`
                INSERT INTO users (id, username, password, fullname, role, permissions, createdAt, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `).run(id, username, hashedPassword, fullname, role, JSON.stringify(finalPermissions), createdAt);

            broadcast('user-created', { id, username, fullname, role, permissions: finalPermissions, createdAt });
            res.json({ success: true, message: 'បានបន្ថែមអ្នកប្រើប្រាស់!', user: { id, username, fullname, role, permissions: finalPermissions, createdAt } });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // PUT update user (admin only)
    router.put('/:id', (req, res) => {
        try {
            const { username, password, fullname, role, permissions, active, userRole } = req.body;
            const { id } = req.params;

            if (userRole !== 'admin') {
                return res.status(403).json({ success: false, message: 'មានតែ Admin ទេដែលអាចកែសម្រួលអ្នកប្រើប្រាស់!' });
            }

            const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
            if (existing) {
                return res.status(400).json({ success: false, message: 'ឈ្មោះអ្នកប្រើប្រាស់មានរួចហើយ!' });
            }

            if (role === 'admin') {
                const currentAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' AND id != ?").get(id);
                if (currentAdmin) {
                    return res.status(400).json({ success: false, message: 'មិនអាចផ្លាស់ប្តូរជា Admin ទេ ព្រោះមាន Admin រួចហើយ!' });
                }
            }

            const finalPermissions = role === 'admin'
                ? ['pos', 'items', 'orders', 'reports', 'users']
                : (permissions || []);

            if (password) {
                const hashedPassword = bcrypt.hashSync(password, 10);
                db.prepare('UPDATE users SET username=?, password=?, fullname=?, role=?, permissions=?, active=? WHERE id=?')
                    .run(username, hashedPassword, fullname, role, JSON.stringify(finalPermissions), active ? 1 : 0, id);
            } else {
                db.prepare('UPDATE users SET username=?, fullname=?, role=?, permissions=?, active=? WHERE id=?')
                    .run(username, fullname, role, JSON.stringify(finalPermissions), active ? 1 : 0, id);
            }

            broadcast('user-updated', { id, username, fullname, role, permissions: finalPermissions, active });
            res.json({ success: true, message: 'បានកែសម្រួលអ្នកប្រើប្រាស់!' });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // DELETE user (admin only)
    router.delete('/:id', (req, res) => {
        try {
            const { userId, userRole } = req.query;

            if (userRole !== 'admin') {
                return res.status(403).json({ success: false, message: 'មានតែ Admin ទេដែលអាចលុបអ្នកប្រើប្រាស់!' });
            }
            if (req.params.id === userId) {
                return res.status(400).json({ success: false, message: 'អ្នកមិនអាចលុបគណនីខ្លួនឯងទេ!' });
            }

            db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
            broadcast('user-deleted', { id: req.params.id });
            res.json({ success: true, message: 'បានលុបអ្នកប្រើប្រាស់!' });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    return router;
};
>>>>>>> acbaef74e4deb37ef63c984d184b45dcbd99c93d
