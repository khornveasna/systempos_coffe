// ─────────────────────────────────────────────────────────────────────────────
// ROLES MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// ── Data Loading ─────────────────────────────────────────────────────────────

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

// ── Open Roles Manager ───────────────────────────────────────────────────────

CoffeePOS.prototype.openRolesManager = async function () {
    await this.loadRolesAndPermissions();
    this.renderRolesManager();
    this.openModal('rolesManagerModal');
};

// ── Render Roles Manager Modal ───────────────────────────────────────────────

CoffeePOS.prototype.renderRolesManager = function () {
    const roles = this.data.roles || [];
    const isAdmin = (this.currentUser?.role === 'admin');

    const cards = roles.map(role => {
        const lockBadge = role.is_system ? '<span class="role-system-badge"><i class="fas fa-lock"></i> ប្រពន្ធ</span>' : '';
        const editBtn = isAdmin
            ? `<button class="role-card-action-btn" onclick="pos.openRoleModal('${role.id}')" title="កែសម្រួល">
                <i class="fas fa-edit"></i>
               </button>`
            : '';
        const delBtn = (isAdmin && !role.is_system)
            ? `<button class="role-card-action-btn role-card-action-btn-danger" onclick="pos.confirmDeleteRole('${role.id}','${role.label}')" title="លុប">
                <i class="fas fa-trash"></i>
               </button>`
            : '';

        return `
        <div class="role-card-modern" style="border-left:4px solid ${role.color}">
            <div class="role-card-header-modern">
                <div class="role-card-identity">
                    <div class="role-card-avatar" style="background:${hexToRgba(role.color, 0.15)};color:${role.color}">
                        <i class="fas ${role.icon || 'fa-user'}"></i>
                    </div>
                    <div class="role-card-info">
                        <strong class="role-card-label">${role.label}</strong>
                        <span class="role-card-name">${role.name}</span>
                        ${lockBadge}
                    </div>
                </div>
                <div class="role-card-actions">${editBtn}${delBtn}</div>
            </div>
            ${role.description ? `<p class="role-card-desc">${role.description}</p>` : ''}
        </div>`;
    }).join('');

    const addBtn = isAdmin
        ? `<button class="btn-modern btn-modern-primary" onclick="pos.openRoleModal()">
               <i class="fas fa-plus"></i> បន្ថែមតួនាទី
           </button>`
        : '';

    document.getElementById('rolesManagerContent').innerHTML = `
        <div class="roles-manager-toolbar-modern">
            ${addBtn}
        </div>
        <div class="roles-grid-modern">${cards || '<p class="text-muted text-center" style="padding:40px;">រកមិនឃើញតួនាទី។</p>'}</div>
    `;
};

// ── Role Create / Edit Modal ─────────────────────────────────────────────────

CoffeePOS.prototype.openRoleModal = async function (roleId) {
    await this.loadRolesAndPermissions();
    let role = null;

    if (roleId) {
        role = (this.data.roles || []).find(r => r.id === roleId);
    }

    const isSystem = role?.is_system;

    document.getElementById('roleModalTitle').textContent = role ? 'កែសម្រួលតួនាទី' : 'បន្ថែមតួនាទីថ្មី';
    document.getElementById('roleModalContent').innerHTML = `
        <input type="hidden" id="roleEditId" value="${role?.id || ''}">
        <div class="form-row">
            <div class="form-group">
                <label>ឈ្មោះតួនាទី (Slug) *</label>
                <input type="text" id="roleEditName" class="form-control" placeholder="ឧ. cashier"
                    value="${role?.name || ''}" ${isSystem ? 'disabled' : ''}>
            </div>
            <div class="form-group">
                <label>ចំណងជើងបង្ហាញ *</label>
                <input type="text" id="roleEditLabel" class="form-control" placeholder="ឧ. អ្នកលក់"
                    value="${role?.label || ''}">
            </div>
        </div>
    `;

    this.openModal('roleEditModal');
};

CoffeePOS.prototype.saveRole = async function () {
    const id = document.getElementById('roleEditId').value;
    const name = document.getElementById('roleEditName').value.trim().toLowerCase().replace(/\s+/g, '_');
    const label = document.getElementById('roleEditLabel').value.trim();

    // Use default values for removed fields
    const color = '#6f4e37';
    const icon = 'fa-user';
    const description = '';

    if (!name || !label) {
        this.showToast('ឈ្មោះតួនាទី និងចំណងជើងគឺចាំបាច់!', 'error');
        return;
    }

    // For new roles, assign default permissions (POS + Orders)
    // For existing roles, keep current permissions unchanged
    let permissionIds = [];
    if (!id) {
        // New role - assign default permissions
        const defaultPerms = this.data.permissions.filter(p =>
            p.key === 'pos' || p.key === 'orders'
        );
        permissionIds = defaultPerms.map(p => p.id);
    } else {
        // Editing role - preserve current permissions
        const existingRole = (this.data.roles || []).find(r => r.id === id);
        if (existingRole) {
            permissionIds = (existingRole.permissions || []).map(p => p.id);
        }
    }

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
            this.showToast(id ? 'បានកែសម្រួលតួនាទី!' : 'បានបន្ថែមតួនាទី!', 'success');
            this.closeModal('roleEditModal');
            await this.openRolesManager();
        } else {
            this.showToast(data.message || 'ការរក្សាទុកបានបរាជ័យ!', 'error');
        }
    } catch (error) {
        console.error('saveRole error:', error);
        this.showToast('Server error', 'error');
    }
};

CoffeePOS.prototype.confirmDeleteRole = function (roleId, roleLabel) {
    if (confirm(`តើអ្នកចង់លុបតួនាទី "${roleLabel}" មែនទេ? អ្នកប្រើបរាស់ដែលមានតួនាទីនេះនឹងមិនអាចចូលប្រើបានទេ។`)) {
        this.deleteRole(roleId);
    }
};

CoffeePOS.prototype.deleteRole = async function (roleId) {
    const userRole = this.currentUser?.role || 'admin';
    try {
        const res = await fetch(`/api/roles/${roleId}?userRole=${userRole}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            this.showToast('បានលុបតួនាទី!', 'success');
            await this.openRolesManager();
        } else {
            this.showToast(data.message || 'ការលុបបានបរាជ័យ!', 'error');
        }
    } catch (error) {
        console.error('deleteRole error:', error);
        this.showToast('Server error', 'error');
    }
};

// ── Modal helpers ────────────────────────────────────────────────────────────

CoffeePOS.prototype.openModal = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
};

CoffeePOS.prototype.closeModal = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
};

// ── Utility ─────────────────────────────────────────────────────────────────

function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(111,78,55,${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}
