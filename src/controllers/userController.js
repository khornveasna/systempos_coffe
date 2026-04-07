// User Controller
const userModel = require('../models/User');

class UserController {
    async getAllUsers(req, res) {
        try {
            const { userRole } = req.query;

            // Only admin can get all users
            if (userRole !== 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'មានតែ Admin ទេដែលអាចមើលអ្នកប្រើប្រាស់ទាំងអស់!' 
                });
            }

            const users = userModel.findAll();
            const sanitizedUsers = users.map(user => userModel.sanitizeUser(user));

            res.json({ 
                success: true, 
                users: sanitizedUsers 
            });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    async getUser(req, res) {
        try {
            const { userRole, userId } = req.query;
            const { id } = req.params;

            const user = userModel.findById(id);
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'User not found' 
                });
            }

            // Users can view their own profile, admin can view all
            if (userRole !== 'admin' && id !== userId) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'អ្នកមិនមានសិទ្ធិមើលអ្នកប្រើប្រាស់នេះទេ!' 
                });
            }

            const sanitizedUser = userModel.sanitizeUser(user);
            res.json({ 
                success: true, 
                user: sanitizedUser 
            });
        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    async createUser(req, res) {
        try {
            const { username, password, fullname, role, permissions, startDate, endDate, userRole } = req.body;

            // Only admin can create users
            if (userRole !== 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'មានតែ Admin ទេដែលអាចបង្កើតអ្នកប្រើប្រាស់!' 
                });
            }

            // Validate input
            if (!username || !password || !fullname || !role) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Missing required fields' 
                });
            }

            // Check if username exists
            const existing = userModel.findByUsername(username);
            if (existing) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'ឈ្មោះអ្នកប្រើប្រាស់មានរួចហើយ!' 
                });
            }

            // Prevent creating multiple admins
            if (role === 'admin') {
                const allUsers = userModel.findAll();
                const adminCount = allUsers.filter(u => u.role === 'admin').length;
                if (adminCount > 0) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'មានតែ Admin មួយគត់ដែលអាចមានក្នុងប្រព័ន្ធ!' 
                    });
                }
            }

            const user = userModel.create({
                username,
                password,
                fullname,
                role,
                permissions,
                startDate,
                endDate
            });

            const sanitizedUser = userModel.sanitizeUser(user);

            // Broadcast user created event (handled by socket service)
            if (req.broadcast) {
                req.broadcast('user-created', sanitizedUser);
            }

            res.status(201).json({
                success: true,
                message: 'បានបន្ថែមអ្នកប្រើប្រាស់!',
                user: sanitizedUser
            });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    async updateUser(req, res) {
        try {
            const { username, password, fullname, role, permissions, startDate, endDate, active, userRole } = req.body;
            const { id } = req.params;

            // Only admin can update users
            if (userRole !== 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'មានតែ Admin ទេដែលអាចកែសម្រួលអ្នកប្រើប្រាស់!' 
                });
            }

            // Check if username exists (excluding current user)
            const existing = userModel.findByUsername(username);
            if (existing && existing.id !== id) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'ឈ្មោះអ្នកប្រើប្រាស់មានរួចហើយ!' 
                });
            }

            // Prevent creating multiple admins
            if (role === 'admin') {
                const allUsers = userModel.findAll();
                const otherAdmins = allUsers.filter(u => u.role === 'admin' && u.id !== id);
                if (otherAdmins.length > 0) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'មិនអាចផ្លាស់ប្តូរជា Admin ទេ ព្រោះមាន Admin រួចហើយ!' 
                    });
                }
            }

            const updatedUser = userModel.update(id, {
                username,
                password,
                fullname,
                role,
                permissions,
                startDate,
                endDate,
                active
            });

            const sanitizedUser = userModel.sanitizeUser(updatedUser);

            // Broadcast user updated event
            if (req.broadcast) {
                req.broadcast('user-updated', sanitizedUser);
            }

            res.json({ 
                success: true, 
                message: 'បានកែសម្រួលអ្នកប្រើប្រាស់!',
                user: sanitizedUser
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }

    async deleteUser(req, res) {
        try {
            const { userId, userRole } = req.query;
            const { id } = req.params;

            // Only admin can delete users
            if (userRole !== 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'មានតែ Admin ទេដែលអាចលុបអ្នកប្រើប្រាស់!' 
                });
            }

            // Prevent admin from deleting themselves
            if (id === userId) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'អ្នកមិនអាចលុបគណនីខ្លួនឯងទេ!' 
                });
            }

            userModel.delete(id);

            // Broadcast user deleted event
            if (req.broadcast) {
                req.broadcast('user-deleted', { id });
            }

            res.json({ 
                success: true, 
                message: 'បានលុបអ្នកប្រើប្រាស់!' 
            });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    }
}

module.exports = new UserController();
