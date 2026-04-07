// User Model
const databaseService = require('../services/database');
const bcrypt = require('bcryptjs');

class UserModel {
    constructor() {
        this._db = null;
    }

    get db() {
        if (!this._db) {
            this._db = databaseService.getDatabase();
        }
        return this._db;
    }

    findById(id) {
        return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }

    findByUsername(username) {
        return this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    }

    findAll() {
        return this.db.prepare('SELECT id, username, fullname, role, permissions, createdAt, startDate, endDate, active FROM users').all();
    }

    create(userData) {
        const { username, password, fullname, role, permissions, startDate, endDate, active = 1 } = userData;
        const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const hashedPassword = bcrypt.hashSync(password, 10);
        const createdAt = new Date().toISOString();

        const finalPermissions = role === 'admin'
            ? ['pos', 'items', 'orders', 'reports', 'users']
            : (permissions || []);

        this.db.prepare(`
            INSERT INTO users (id, username, password, fullname, role, permissions, createdAt, startDate, endDate, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, username, hashedPassword, fullname, role, JSON.stringify(finalPermissions), createdAt, startDate || null, endDate || null, active ? 1 : 0);

        return this.findById(id);
    }

    update(id, updateData) {
        const { username, password, fullname, role, permissions, startDate, endDate, active } = updateData;

        const finalPermissions = role === 'admin'
            ? ['pos', 'items', 'orders', 'reports', 'users']
            : (permissions || []);

        if (password) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            this.db.prepare(`
                UPDATE users SET username = ?, password = ?, fullname = ?, role = ?, permissions = ?, startDate = ?, endDate = ?, active = ?
                WHERE id = ?
            `).run(username, hashedPassword, fullname, role, JSON.stringify(finalPermissions), startDate || null, endDate || null, active ? 1 : 0, id);
        } else {
            this.db.prepare(`
                UPDATE users SET username = ?, fullname = ?, role = ?, permissions = ?, startDate = ?, endDate = ?, active = ?
                WHERE id = ?
            `).run(username, fullname, role, JSON.stringify(finalPermissions), startDate || null, endDate || null, active ? 1 : 0, id);
        }

        return this.findById(id);
    }

    delete(id) {
        return this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
    }

    verifyPassword(plainPassword, hashedPassword) {
        return bcrypt.compareSync(plainPassword, hashedPassword);
    }

    sanitizeUser(user) {
        if (!user) return null;
        const { password, ...userWithoutPassword } = user;
        return {
            ...userWithoutPassword,
            permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions
        };
    }
}

module.exports = new UserModel();
