// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ROLES & PERMISSIONS MANAGEMENT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€ Data Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CoffeePOS.prototype.loadRolesAndPermissions = async function () {
    try {
        const userRole = this.currentUser?.role || 'admin';
        const [rolesRes, permsRes] = await Promise.all([
            fetch(`/api/roles?userRole=${userRole}`),
            fetch(`/api/roles/permissions?userRole=${userRole}`)
        ]);
        const rolesData = await rolesRes.json();
        const permsData = await permsRes.json();

        if (rolesData.success) this.data.roles = rolesData.roles;
        if (permsData.success) this.data.permissions = permsData.permissions;
    } catch (error) {
        console.error('loadRolesAndPermissions error:', error);
        this.data.roles = this.data.roles || [];
        this.data.permissions = this.data.permissions || [];
    }
};

// â”€â”€ Open Roles Manager â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CoffeePOS.prototype.openRolesManager = async function () {
    await this.loadRolesAndPermissions();
    this.renderRolesManager();
    this.openModal('rolesManagerModal');
};

// â”€â”€ Render Roles Manager Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CoffeePOS.prototype.renderRolesManager = function () {
    const roles = this.data.roles || [];
    const isAdmin = (this.currentUser?.role === 'admin');

    const cards = roles.map(role => {
        const permChips = (role.permissions || []).map(p =>
            `<span class="perm-chip" style="background:${hexToRgba(role.color, 0.18)};color:${role.color}">
                <i class="fas ${p.icon || 'fa-key'}"></i> ${p.label}
            </span>`
        ).join('');

        const lockBadge = role.is_system ? '<span class="role-system-badge"><i class="fas fa-lock"></i> System</span>' : '';
        const editBtn = isAdmin
            ? `<button class="btn btn-sm btn-outline" onclick="pos.openRoleModal('${role.id}')"><i class="fas fa-edit"></i></button>`
            : '';
        const delBtn = (isAdmin && !role.is_system)
            ? `<button class="btn btn-sm btn-danger-outline" onclick="pos.confirmDeleteRole('${role.id}','${role.label}')"><i class="fas fa-trash"></i></button>`
            : '';

        return `
        <div class="role-card" style="border-left:4px solid ${role.color}">
            <div class="role-card-header">
                <span class="role-card-icon" style="background:${hexToRgba(role.color, 0.15)};color:${role.color}">
                    <i class="fas ${role.icon || 'fa-user'}"></i>
                </span>
                <div class="role-card-meta">
                    <strong>${role.label}</strong>
                    <code>${role.name}</code>
                    ${lockBadge}
                </div>
                <div class="role-card-actions">${editBtn}${delBtn}</div>
            </div>
            ${role.description ? `<p class="role-card-desc">${role.description}</p>` : ''}
            <div class="role-perm-chips">${permChips || '<span class="text-muted">No permissions</span>'}</div>
        </div>`;
    }).join('');

    const addBtn = isAdmin
        ? `<button class="btn btn-primary" onclick="pos.openRoleModal()">
               <i class="fas fa-plus"></i> Add Role
           </button>`
        : '';

    document.getElementById('rolesManagerContent').innerHTML = `
        <div class="roles-manager-toolbar">${addBtn}
            <button class="btn btn-outline" onclick="pos.openPermissionsManager()">
                <i class="fas fa-key"></i> Manage Permissions
            </button>
        </div>
        <div class="roles-grid">${cards || '<p class="text-muted">No roles found.</p>'}</div>
    `;
};

// â”€â”€ Role Create / Edit Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CoffeePOS.prototype.openRoleModal = async function (roleId) {
    await this.loadRolesAndPermissions();
    const permissions = this.data.permissions || [];
    let role = null;

    if (roleId) {
        role = (this.data.roles || []).find(r => r.id === roleId);
    }

    const isSystem = role?.is_system;
    const assignedIds = new Set((role?.permissions || []).map(p => p.id));

    const permChecks = permissions.map(p => {
        const checked = assignedIds.has(p.id) ? 'checked' : '';
        const locked = isSystem && role?.name === 'admin' ? 'disabled' : '';
        return `
        <label class="perm-check-item ${locked ? 'locked' : ''}">
            <input type="checkbox" name="permissionIds" value="${p.id}" ${checked} ${locked}>
            <span class="perm-check-icon"><i class="fas ${p.icon || 'fa-key'}"></i></span>
            <span class="perm-check-label">${p.label}</span>
        </label>`;
    }).join('');

    const colorVal = role?.color || '#6f4e37';
    const iconVal = role?.icon || 'fa-user';

    document.getElementById('roleModalTitle').textContent = role ? 'Edit Role' : 'New Role';
    document.getElementById('roleModalContent').innerHTML = `
        <input type="hidden" id="roleEditId" value="${role?.id || ''}">
        <div class="form-row">
            <div class="form-group">
                <label>Role Name (slug) *</label>
                <input type="text" id="roleEditName" class="form-control" placeholder="e.g. cashier"
                    value="${role?.name || ''}" ${isSystem ? 'disabled' : ''}>
            </div>
            <div class="form-group">
                <label>Display Label *</label>
                <input type="text" id="roleEditLabel" class="form-control" placeholder="e.g. Cashier"
                    value="${role?.label || ''}">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Color</label>
                <div class="color-input-row">
                    <input type="color" id="roleEditColor" value="${colorVal}" class="color-picker">
                    <span id="roleEditColorHex" class="color-hex-label">${colorVal}</span>
                </div>
            </div>
            <div class="form-group">
                <label>Icon (Font Awesome class)</label>
                <input type="text" id="roleEditIcon" class="form-control" placeholder="e.g. fa-user-tie"
                    value="${iconVal}">
            </div>
        </div>
        <div class="form-group">
            <label>Description</label>
            <input type="text" id="roleEditDesc" class="form-control" placeholder="Optional description"
                value="${role?.description || ''}">
        </div>
        <div class="form-group">
            <label>Permissions ${isSystem && role?.name === 'admin' ? '<i class="fas fa-lock text-muted"></i>' : ''}</label>
            <div class="perm-checks-grid">${permChecks}</div>
        </div>
    `;

    document.getElementById('roleEditColor').addEventListener('input', e => {
        document.getElementById('roleEditColorHex').textContent = e.target.value;
    });

    this.openModal('roleEditModal');
};

CoffeePOS.prototype.saveRole = async function () {
    const id = document.getElementById('roleEditId').value;
    const name = document.getElementById('roleEditName').value.trim().toLowerCase().replace(/\s+/g, '_');
    const label = document.getElementById('roleEditLabel').value.trim();
    const color = document.getElementById('roleEditColor').value;
    const icon = document.getElementById('roleEditIcon').value.trim() || 'fa-user';
    const description = document.getElementById('roleEditDesc').value.trim();

    if (!name || !label) {
        this.showToast('Name and label are required', 'error');
        return;
    }

    const permissionIds = Array.from(document.querySelectorAll('input[name="permissionIds"]:checked'))
        .map(cb => cb.value);

    const userRole = this.currentUser?.role || 'admin';
    const body = { userRole, name, label, color, icon, description, permissionIds };
    const url = id ? `/api/roles/${id}` : '/api/roles';
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) {
            this.showToast(id ? 'Role updated' : 'Role created', 'success');
            this.closeModal('roleEditModal');
            await this.openRolesManager();
        } else {
            this.showToast(data.message || 'Save failed', 'error');
        }
    } catch (error) {
        console.error('saveRole error:', error);
        this.showToast('Server error', 'error');
    }
};

CoffeePOS.prototype.confirmDeleteRole = function (roleId, roleLabel) {
    if (confirm(`Delete role "${roleLabel}"? Users with this role will not be able to log in.`)) {
        this.deleteRole(roleId);
    }
};

CoffeePOS.prototype.deleteRole = async function (roleId) {
    const userRole = this.currentUser?.role || 'admin';
    try {
        const res = await fetch(`/api/roles/${roleId}?userRole=${userRole}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            this.showToast('Role deleted', 'success');
            await this.openRolesManager();
        } else {
            this.showToast(data.message || 'Delete failed', 'error');
        }
    } catch (error) {
        console.error('deleteRole error:', error);
        this.showToast('Server error', 'error');
    }
};

// â”€â”€ Permissions Manager â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CoffeePOS.prototype.openPermissionsManager = async function () {
    await this.loadRolesAndPermissions();
    this.renderPermissionsManager();
    this.openModal('permissionsManagerModal');
};

CoffeePOS.prototype.renderPermissionsManager = function () {
    const permissions = this.data.permissions || [];
    const isAdmin = (this.currentUser?.role === 'admin');

    const rows = permissions.map(p => {
        const lockBadge = p.is_system ? '<span class="role-system-badge"><i class="fas fa-lock"></i> System</span>' : '';
        const editBtn = (isAdmin && !p.is_system)
            ? `<button class="btn btn-sm btn-outline" onclick="pos.openPermissionModal('${p.id}')"><i class="fas fa-edit"></i></button>`
            : '';
        const delBtn = (isAdmin && !p.is_system)
            ? `<button class="btn btn-sm btn-danger-outline" onclick="pos.confirmDeletePermission('${p.id}','${p.label}')"><i class="fas fa-trash"></i></button>`
            : '';
        return `
        <tr>
            <td><code>${p.key}</code></td>
            <td><i class="fas ${p.icon || 'fa-key'}"></i> ${p.label}</td>
            <td>${p.label_km || ''}</td>
            <td>${p.description || ''}</td>
            <td>${lockBadge}</td>
            <td class="table-actions">${editBtn}${delBtn}</td>
        </tr>`;
    }).join('');

    const addBtn = isAdmin
        ? `<button class="btn btn-primary" onclick="pos.openPermissionModal()"><i class="fas fa-plus"></i> Add Permission</button>`
        : '';

    document.getElementById('permissionsManagerContent').innerHTML = `
        <div class="roles-manager-toolbar">${addBtn}</div>
        <table class="data-table">
            <thead><tr><th>Key</th><th>Label</th><th>Label (KH)</th><th>Description</th><th>System</th><th>Actions</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="text-muted text-center">No permissions</td></tr>'}</tbody>
        </table>
    `;
};

CoffeePOS.prototype.openPermissionModal = function (permId) {
    const perm = permId ? (this.data.permissions || []).find(p => p.id === permId) : null;

    document.getElementById('permModalTitle').textContent = perm ? 'Edit Permission' : 'New Permission';
    document.getElementById('permModalContent').innerHTML = `
        <input type="hidden" id="permEditId" value="${perm?.id || ''}">
        <div class="form-group">
            <label>Permission Key (slug) *</label>
            <input type="text" id="permEditKey" class="form-control" placeholder="e.g. perm_kitchen"
                value="${perm?.key || ''}" ${perm ? 'disabled' : ''}>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Label (EN) *</label>
                <input type="text" id="permEditLabel" class="form-control" value="${perm?.label || ''}">
            </div>
            <div class="form-group">
                <label>Label (KH) *</label>
                <input type="text" id="permEditLabelKm" class="form-control" value="${perm?.label_km || ''}">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Icon (fa-...)</label>
                <input type="text" id="permEditIcon" class="form-control" placeholder="fa-key" value="${perm?.icon || ''}">
            </div>
            <div class="form-group">
                <label>Description</label>
                <input type="text" id="permEditDesc" class="form-control" value="${perm?.description || ''}">
            </div>
        </div>
    `;
    this.openModal('permissionEditModal');
};

CoffeePOS.prototype.savePermission = async function () {
    const id = document.getElementById('permEditId').value;
    const key = document.getElementById('permEditKey').value.trim();
    const label = document.getElementById('permEditLabel').value.trim();
    const label_km = document.getElementById('permEditLabelKm').value.trim();
    const icon = document.getElementById('permEditIcon').value.trim() || 'fa-key';
    const description = document.getElementById('permEditDesc').value.trim();

    if ((!id && !key) || !label || !label_km) {
        this.showToast('Key, label and Khmer label are required', 'error');
        return;
    }

    const userRole = this.currentUser?.role || 'admin';
    const body = { userRole, key, label, label_km, icon, description };
    const url = id ? `/api/roles/permissions/${id}` : '/api/roles/permissions';
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) {
            this.showToast(id ? 'Permission updated' : 'Permission created', 'success');
            this.closeModal('permissionEditModal');
            await this.openPermissionsManager();
            await this.loadRolesAndPermissions();
        } else {
            this.showToast(data.message || 'Save failed', 'error');
        }
    } catch (error) {
        console.error('savePermission error:', error);
        this.showToast('Server error', 'error');
    }
};

CoffeePOS.prototype.confirmDeletePermission = function (permId, permLabel) {
    if (confirm(`Delete permission "${permLabel}"? This will remove it from all roles.`)) {
        this.deletePermission(permId);
    }
};

CoffeePOS.prototype.deletePermission = async function (permId) {
    const userRole = this.currentUser?.role || 'admin';
    try {
        const res = await fetch(`/api/roles/permissions/${permId}?userRole=${userRole}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            this.showToast('Permission deleted', 'success');
            await this.openPermissionsManager();
            await this.loadRolesAndPermissions();
        } else {
            this.showToast(data.message || 'Delete failed', 'error');
        }
    } catch (error) {
        console.error('deletePermission error:', error);
        this.showToast('Server error', 'error');
    }
};

// â”€â”€ Modal helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CoffeePOS.prototype.openModal = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
};

CoffeePOS.prototype.closeModal = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
};

// â”€â”€ Utility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(111,78,55,${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

