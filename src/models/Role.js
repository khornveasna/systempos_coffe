// Role & Permission Model
const databaseService = require('../services/database');

class RoleModel {
    constructor() {
        this._db = null;
    }

    get db() {
        if (!this._db) this._db = databaseService.getDatabase();
        return this._db;
    }

    // ── Permissions ─────────────────────────────────────────────────────────

    findAllPermissions() {
        return this.db.prepare('SELECT * FROM permissions ORDER BY id').all();
    }

    findPermissionByKey(key) {
        return this.db.prepare('SELECT * FROM permissions WHERE key = ?').get(key);
    }

    createPermission({ key, label, label_km, icon = 'fa-key', description = '' }) {
        const id = `perm_${key.replace(/[^a-z0-9]/gi, '_')}`;
        this.db.prepare(`
            INSERT INTO permissions (id, key, label, label_km, icon, description, is_system)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        `).run(id, key, label, label_km, icon, description);
        return this.db.prepare('SELECT * FROM permissions WHERE id = ?').get(id);
    }

    updatePermission(id, { label, label_km, icon, description }) {
        this.db.prepare(`
            UPDATE permissions SET label = ?, label_km = ?, icon = ?, description = ?
            WHERE id = ? AND is_system = 0
        `).run(label, label_km, icon, description, id);
        return this.db.prepare('SELECT * FROM permissions WHERE id = ?').get(id);
    }

    deletePermission(id) {
        const perm = this.db.prepare('SELECT * FROM permissions WHERE id = ?').get(id);
        if (!perm) return { changes: 0, error: 'Not found' };
        if (perm.is_system) return { changes: 0, error: 'Cannot delete system permission' };
        return this.db.prepare('DELETE FROM permissions WHERE id = ?').run(id);
    }

    // ── Roles ────────────────────────────────────────────────────────────────

    findAll() {
        const roles = this.db.prepare('SELECT * FROM roles ORDER BY is_system DESC, label').all();
        return roles.map(role => this._attachPermissions(role));
    }

    findById(id) {
        const role = this.db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
        return role ? this._attachPermissions(role) : null;
    }

    findByName(name) {
        const role = this.db.prepare('SELECT * FROM roles WHERE name = ?').get(name);
        return role ? this._attachPermissions(role) : null;
    }

    getPermissionKeys(roleId) {
        return this.db.prepare(`
            SELECT p.key FROM permissions p
            JOIN role_permissions rp ON rp.permission_id = p.id
            WHERE rp.role_id = ?
        `).all(roleId).map(r => r.key);
    }

    create({ name, label, color = '#6f4e37', icon = 'fa-user', description = '', permissionIds = [] }) {
        const id = `role_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
        this.db.prepare(`
            INSERT INTO roles (id, name, label, color, icon, description, is_system)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        `).run(id, name, label, color, icon, description);
        this._setPermissions(id, permissionIds);
        return this.findById(id);
    }

    update(id, { name, label, color, icon, description, permissionIds = [] }) {
        const role = this.db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
        if (!role) return null;

        // System roles: cannot rename but can update label/color/icon/perms
        if (role.is_system) {
            this.db.prepare(`
                UPDATE roles SET label = ?, color = ?, icon = ?, description = ? WHERE id = ?
            `).run(label, color, icon, description, id);
        } else {
            this.db.prepare(`
                UPDATE roles SET name = ?, label = ?, color = ?, icon = ?, description = ? WHERE id = ?
            `).run(name, label, color, icon, description, id);
        }

        // Admin role always keeps all permissions
        if (role.is_system && role.name === 'admin') {
            const allPerms = this.db.prepare('SELECT id FROM permissions').all().map(p => p.id);
            this._setPermissions(id, allPerms);
        } else {
            this._setPermissions(id, permissionIds);
        }

        return this.findById(id);
    }

    delete(id) {
        const role = this.db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
        if (!role) return { changes: 0, error: 'Not found' };
        if (role.is_system) return { changes: 0, error: 'Cannot delete system role' };

        // Check if any users are using this role
        const usersCount = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get(role.name);
        if (usersCount.count > 0) {
            return { changes: 0, error: `Cannot delete — ${usersCount.count} user(s) using this role` };
        }

        return this.db.prepare('DELETE FROM roles WHERE id = ?').run(id);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    _attachPermissions(role) {
        const perms = this.db.prepare(`
            SELECT p.* FROM permissions p
            JOIN role_permissions rp ON rp.permission_id = p.id
            WHERE rp.role_id = ?
            ORDER BY p.id
        `).all(role.id);
        return { ...role, permissions: perms, permissionKeys: perms.map(p => p.key) };
    }

    _setPermissions(roleId, permissionIds) {
        this.db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(roleId);
        const insert = this.db.prepare(
            'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
        );
        const insertMany = this.db.transaction(ids => {
            for (const pid of ids) insert.run(roleId, pid);
        });
        insertMany(permissionIds);
    }
}

module.exports = new RoleModel();
