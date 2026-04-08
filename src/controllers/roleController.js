// Role & Permission Controller
const roleModel = require('../models/Role');

class RoleController {

    // ── Permissions ──────────────────────────────────────────────────────────

    getAllPermissions(req, res) {
        try {
            const permissions = roleModel.findAllPermissions();
            res.json({ success: true, permissions });
        } catch (error) {
            console.error('Get permissions error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    createPermission(req, res) {
        try {
            const { userRole } = req.body;
            if (userRole !== 'admin') {
                return res.status(403).json({ success: false, message: 'Admin only' });
            }
            const { key, label, label_km, icon, description } = req.body;
            if (!key || !label || !label_km) {
                return res.status(400).json({ success: false, message: 'key, label and label_km are required' });
            }
            const existing = roleModel.findPermissionByKey(key);
            if (existing) {
                return res.status(400).json({ success: false, message: 'Permission key already exists' });
            }
            const permission = roleModel.createPermission({ key, label, label_km, icon, description });
            res.status(201).json({ success: true, permission });
        } catch (error) {
            console.error('Create permission error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    updatePermission(req, res) {
        try {
            const { userRole } = req.body;
            if (userRole !== 'admin') {
                return res.status(403).json({ success: false, message: 'Admin only' });
            }
            const { id } = req.params;
            const { label, label_km, icon, description } = req.body;
            const result = roleModel.updatePermission(id, { label, label_km, icon, description });
            if (!result) return res.status(404).json({ success: false, message: 'Permission not found' });
            res.json({ success: true, permission: result });
        } catch (error) {
            console.error('Update permission error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    deletePermission(req, res) {
        try {
            const { userRole } = req.query;
            if (userRole !== 'admin') {
                return res.status(403).json({ success: false, message: 'Admin only' });
            }
            const result = roleModel.deletePermission(req.params.id);
            if (result.error) return res.status(400).json({ success: false, message: result.error });
            res.json({ success: true, message: 'Permission deleted' });
        } catch (error) {
            console.error('Delete permission error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    // ── Roles ────────────────────────────────────────────────────────────────

    getAllRoles(req, res) {
        try {
            const roles = roleModel.findAll();
            res.json({ success: true, roles });
        } catch (error) {
            console.error('Get roles error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    getRole(req, res) {
        try {
            const role = roleModel.findById(req.params.id);
            if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
            res.json({ success: true, role });
        } catch (error) {
            console.error('Get role error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    createRole(req, res) {
        try {
            const { userRole, name, label, color, icon, description, permissionIds } = req.body;
            if (userRole !== 'admin') {
                return res.status(403).json({ success: false, message: 'Admin only' });
            }
            if (!name || !label) {
                return res.status(400).json({ success: false, message: 'name and label are required' });
            }
            const existing = roleModel.findByName(name);
            if (existing) {
                return res.status(400).json({ success: false, message: 'Role name already exists' });
            }
            const role = roleModel.create({ name, label, color, icon, description, permissionIds: permissionIds || [] });
            res.status(201).json({ success: true, role });
        } catch (error) {
            console.error('Create role error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    updateRole(req, res) {
        try {
            const { userRole, name, label, color, icon, description, permissionIds } = req.body;
            if (userRole !== 'admin') {
                return res.status(403).json({ success: false, message: 'Admin only' });
            }
            const role = roleModel.update(req.params.id, {
                name, label, color, icon, description,
                permissionIds: permissionIds || []
            });
            if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
            res.json({ success: true, role });
        } catch (error) {
            console.error('Update role error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }

    deleteRole(req, res) {
        try {
            const { userRole } = req.query;
            if (userRole !== 'admin') {
                return res.status(403).json({ success: false, message: 'Admin only' });
            }
            const result = roleModel.delete(req.params.id);
            if (result.error) return res.status(400).json({ success: false, message: result.error });
            res.json({ success: true, message: 'Role deleted' });
        } catch (error) {
            console.error('Delete role error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
}

module.exports = new RoleController();
