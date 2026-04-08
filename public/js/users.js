// Users: list, open modal, save, delete

// ── Helper: Populate role dropdown from database ──────────────────────────
CoffeePOS.prototype.populateRoleDropdown = function () {
    const select = document.getElementById('userRole');
    if (!select) return;

    const roles = this.data.roles || [];
    
    // Clear existing options
    select.innerHTML = '';
    
    // Add default option
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- ជ្រើសរើសតួនាទី --';
    select.appendChild(defaultOpt);
    
    // Add role options from database
    roles.forEach(role => {
        const opt = document.createElement('option');
        opt.value = role.name;
        opt.textContent = role.label;
        opt.dataset.roleId = role.id;
        opt.dataset.roleColor = role.color || '#6f4e37';
        select.appendChild(opt);
    });
};

CoffeePOS.prototype.renderUsers = async function () {
    if (this.currentUser.role !== 'admin') {
        document.getElementById('usersPage').classList.add('hidden');
        return;
    }

    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">កំពុងទាញយកទិន្នន័យ...</td></tr>';

    // Ensure roles and permissions are loaded from DB before rendering
    if (!this.data.roles || !this.data.roles.length) {
        await this.loadRolesAndPermissions();
    }

    try {
        const result = await fetch(
            `/api/users?userId=${this.currentUser.id}&userRole=${this.currentUser.role}`
        ).then(r => r.json());

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-light);">${result.message || 'មិនអាចតាញយកតិន្នយបានតើ!'}</td></tr>`;
            this.showToast(result.message || 'មិនអាចទាញយកទិន្នន័យបានទេ!', 'error');
            return;
        }

        const { users } = result;
        this.data.users = users;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-light);">គ្មានអ្នកប្រើប្រាស់</td></tr>';
            return;
        }

        // Build permission label map from loaded data (fallback to built-in names)
        const permLabelMap = {};
        (this.data.permissions || []).forEach(p => { permLabelMap[p.key] = p.label; });
        const fallbackLabels = { pos: 'POS', items: 'ភេសជ្ជៈ', orders: 'ការលក់', reports: 'របាយការណ៍', users: 'អ្នកប្រើ' };

        // Build role label map
        const roleLabelMap = {};
        (this.data.roles || []).forEach(r => { roleLabelMap[r.name] = r; });
        const fallbackRoleNames = { admin: 'Admin', manager: 'អ្នកគ្រប់គ្រង', staff: 'បុគ្គលិក' };

        tbody.innerHTML = users.map(user => {
            const perms = (user.permissions || []);
            const roleObj = roleLabelMap[user.role];
            const roleColor = roleObj?.color || '#6f4e37';
            const roleLabel = roleObj?.label || fallbackRoleNames[user.role] || user.role;
            const permHtml = perms.map(p => {
                const label = permLabelMap[p] || fallbackLabels[p] || p;
                return `<span class="perm-chip perm-${p}">${label}</span>`;
            }).join('');
            return `
            <tr>
                <td>${user.username}</td>
                <td>${user.fullname}</td>
                <td><span class="role-badge" style="background:${hexToRgba(roleColor,0.15)};color:${roleColor};border:1px solid ${hexToRgba(roleColor,0.35)}">${roleLabel}</span></td>
                <td><div class="perm-chips">${permHtml}</div></td>
                <td>${formatDisplayDate(user.createdAt)}</td>
                <td>
                    <button class="btn-view-order" onclick="pos.openUserModal('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${user.id !== this.currentUser.id ? `
                        <button class="btn-delete-item" onclick="pos.deleteUser('${user.id}')" style="margin-left:5px;">
                            <i class="fas fa-trash"></i>
                        </button>` : ''}
                </td>
            </tr>`;
        }).join('');
    } catch (error) {
        console.error('Render users error:', error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-light);">កំហុស: ${error.message}</td></tr>`;
        this.showToast('កំហុសក្នុងការទាញយកទិន្នន័យ: ' + error.message, 'error');
    }
};

CoffeePOS.prototype.onRoleChange = function (roleName, customPerms) {
    // Handle empty role selection
    if (!roleName) {
        this._renderPermissionCheckboxes([], false, null);
        return;
    }

    // Find role from loaded data
    const roleObj = (this.data.roles || []).find(r => r.name === roleName);
    const isAdmin = roleName === 'admin';
    const defaultPerms = roleObj ? (roleObj.permissions || []).map(p => p.key) : [];
    const perms   = customPerms || defaultPerms;
    const locked  = isAdmin;

    // Re-render permission checkboxes dynamically
    this._renderPermissionCheckboxes(perms, locked, roleObj);
};

CoffeePOS.prototype._renderPermissionCheckboxes = function (checkedPerms, locked, roleObj) {
    const grid = document.getElementById('permissionsGrid');
    if (!grid) return;

    const checkedSet = new Set(checkedPerms);

    // Use permissions from database (5 permissions: pos, items, orders, reports, users)
    const permissions = this.data.permissions || [];

    if (permissions.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:20px;">គ្មានសិទ្ធិ</p>';
        return;
    }

    grid.innerHTML = permissions.map(p => {
        const isChecked  = checkedSet.has(p.key) ? 'active' : '';
        const isDisabled = locked ? 'disabled' : '';
        return `
        <label class="permission-menu-item ${isChecked} ${locked ? 'locked' : ''}" data-perm="${p.key}">
            <input type="checkbox" id="perm_${p.key}" data-perm-key="${p.key}" ${checkedSet.has(p.key) ? 'checked' : ''} ${isDisabled}>
            <i class="fas ${p.icon || 'fa-key'}"></i>
            <span>${p.label_km || p.label}</span>
        </label>`;
    }).join('');

    // Add click handlers to toggle active class
    const checkboxes = grid.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            const parentLabel = this.closest('.permission-menu-item');
            if (this.checked) {
                parentLabel.classList.add('active');
            } else {
                parentLabel.classList.remove('active');
            }
        });
    });

    // Lock badge
    const badge = document.getElementById('permLockBadge');
    if (badge) badge.classList.toggle('hidden', !locked);

    // Role description
    const descEl = document.getElementById('roleDescription');
    const descTxt = document.getElementById('roleDescText');
    if (roleObj && descEl && descTxt) {
        descTxt.textContent = roleObj.description || roleObj.label || '';
        descEl.style.color  = roleObj.color || '#6f4e37';
        descEl.style.background = hexToRgba(roleObj.color || '#6f4e37', 0.08);
        descEl.style.borderColor = hexToRgba(roleObj.color || '#6f4e37', 0.3);
    }
};

CoffeePOS.prototype.openUserModal = async function (userId = null) {
    if (this.currentUser.role !== 'admin') {
        this.showToast('មានតែ Admin ទេដែលអាចគ្រប់គ្រងអ្នកប្រើប្រាស់!', 'error');
        return;
    }

    // Ensure roles/permissions loaded before rendering checkboxes
    if (!this.data.roles || !this.data.roles.length) {
        await this.loadRolesAndPermissions();
    }

    const modal = document.getElementById('userModal');
    const form  = document.getElementById('userForm');
    form.reset();
    document.getElementById('userPassword').required   = !userId;
    document.getElementById('passwordNote').style.display = userId ? 'block' : 'none';

    // Populate role dropdown with roles from database
    this.populateRoleDropdown();

    if (userId) {
        const user = this.data.users.find(u => u.id === userId);
        if (user) {
            this.editingUser = user;
            document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-edit"></i> កែសម្រួលអ្នកប្រើប្រាស់';
            document.getElementById('userId').value       = user.id;
            document.getElementById('userUsername').value = user.username;
            document.getElementById('userFullname').value = user.fullname;
            document.getElementById('userPassword').value = '';
            
            // Set role value after dropdown is populated
            document.getElementById('userRole').value     = user.role;

            // Apply role UI with user's actual saved permissions
            this.onRoleChange(user.role, user.permissions || []);

            if (user.startDate) {
                document.getElementById('userStartDate').value = new Date(user.startDate).toISOString().slice(0, 16);
            } else {
                document.getElementById('userStartDate').value = '';
            }
            if (user.endDate) {
                document.getElementById('userEndDate').value = new Date(user.endDate).toISOString().slice(0, 16);
            } else {
                document.getElementById('userEndDate').value = '';
            }
        }
    } else {
        this.editingUser = null;
        document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-plus"></i> បន្ថែមអ្នកប្រើប្រាស់';
        document.getElementById('userId').value = '';
        
        // Default to staff role after dropdown is populated
        const staffOption = Array.from(document.getElementById('userRole').options).find(opt => opt.value === 'staff');
        if (staffOption) {
            document.getElementById('userRole').value = 'staff';
            this.onRoleChange('staff');
        } else {
            // Fallback if staff role doesn't exist
            this.onRoleChange('', []);
        }
    }

    modal.classList.add('active');
};

CoffeePOS.prototype.saveUser = async function () {
    if (this.currentUser.role !== 'admin') {
        this.showToast('មានតែ Admin ទេដែលអាចគ្រប់គ្រងអ្នកប្រើប្រាស់!', 'error');
        return;
    }

    const id       = document.getElementById('userId').value;
    const username = document.getElementById('userUsername').value;
    const fullname = document.getElementById('userFullname').value;
    const password = document.getElementById('userPassword').value;
    const role     = document.getElementById('userRole').value;
    const startDate = document.getElementById('userStartDate').value || null;
    const endDate   = document.getElementById('userEndDate').value || null;

    // Validate dates
    if (startDate && endDate) {
        if (new Date(endDate) < new Date(startDate)) {
            this.showToast('កាលបរិច្ឆេទបញ្ចប់មិនអាចមុនកាលបរិច្ឆេទចាប់ផ្តើមទេ!', 'error');
            return;
        }
    }

    if (!id && !password) {
        this.showToast('សូមបញ្ចូលពាក្យសម្ងាត់!', 'error');
        return;
    }

    // Prevent assigning admin role when one already exists
    if (role === 'admin' && id) {
        const existing = this.data.users.find(u => u.id === id);
        if (existing && existing.role !== 'admin') {
            const otherAdmins = this.data.users.filter(u => u.role === 'admin' && u.id !== id);
            if (otherAdmins.length > 0) {
                this.showToast('មិនអាចផ្លាស់ប្តូរជា Admin ទេ ព្រោះមាន Admin រួចហើយ!', 'error');
                return;
            }
        }
    }
    if (role === 'admin' && !id) {
        const existingAdmins = this.data.users.filter(u => u.role === 'admin' && u.id !== this.currentUser.id);
        if (existingAdmins.length > 0) {
            this.showToast('មានតែ Admin មួយគត់ដែលអាចមានក្នុងប្រព័ន្ធ!', 'error');
            return;
        }
    }

    const permissions = Array.from(
        document.querySelectorAll('#permissionsGrid input[data-perm-key]:checked')
    ).map(cb => cb.getAttribute('data-perm-key'));

    if (role === 'admin') {
        permissions.length = 0;
        permissions.push(...(this.data.permissions || []).map(p => p.key));
    }

    const isUpdatingCurrentUser = id && id === this.currentUser.id;

    try {
        let result;
        if (id) {
            const res = await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username, fullname,
                    password: password || undefined,
                    role, permissions, active: true,
                    startDate, endDate,
                    userId: this.currentUser.id,
                    userRole: this.currentUser.role
                })
            });
            result = await res.json();

            if (result.success) {
                const user = this.data.users.find(u => u.id === id);
                if (user) {
                    Object.assign(user, { username, fullname, role, permissions });
                    if (isUpdatingCurrentUser) {
                        this.currentUser.permissions = permissions;
                        if (role === 'admin') {
                            this.currentUser.role        = 'admin';
                            this.currentUser.permissions = ['pos', 'items', 'orders', 'reports', 'users'];
                        }
                    }
                }
                this.showToast('បានកែសម្រួលអ្នកប្រើប្រាស់!', 'success');
            } else {
                this.showToast(result.message || 'កំហុសក្នុងការកែសម្រួល!', 'error');
                return;
            }
        } else {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username, password, fullname, role, permissions,
                    startDate, endDate,
                    userId: this.currentUser.id,
                    userRole: this.currentUser.role
                })
            });
            result = await res.json();

            if (result.success) {
                this.showToast('បានបន្ថែមអ្នកប្រើប្រាស់!', 'success');
            } else {
                this.showToast(result.message || 'កំហុសក្នុងការបន្ថែម!', 'error');
                return;
            }
        }

        saveData(this.data);
        this.closeAllModals();
        await this.renderUsers();

        if (isUpdatingCurrentUser) {
            
            // Update current user's permissions in memory
            this.currentUser.permissions = permissions;
            this.currentUser.role = role;

            // Apply permissions immediately
            this.applyUserPermissions();

            this.showToast('សិទ្ធិប្ើប្ាស់ត្រូវបានធ្វើបច្ចុប្បន្នភាព! កំពុងផ្ទុកើងវិញ...', 'success');

            // Reload page after a short delay to apply all changes
            setTimeout(() => {
                location.reload();
            }, 1500);
        }
    } catch (error) {
        console.error('User save error:', error);
        this.showToast('មានកំហុសកើតឡើង!', 'error');
    }
};

CoffeePOS.prototype.deleteUser = async function (id) {
    if (this.currentUser.role !== 'admin') {
        this.showToast('មានតែ Admin ទេដែលអាចលុបអ្នកប្រើប្រាស់!', 'error');
        return;
    }
    const confirmed = await this.showConfirmDialog('តើអ្នកចង់លុបអ្នកប្រើប្រាស់នេះទេ?', {
        title: 'លុបអ្នកប្រើប្រាស់',
        confirmText: 'លុប',
        confirmIcon: 'fa-trash',
        confirmClass: 'danger'
    });

    if (!confirmed) return;

    try {
        const result = await fetch(
            `/api/users/${id}?userId=${this.currentUser.id}&userRole=${this.currentUser.role}`,
            { method: 'DELETE' }
        ).then(r => r.json());

        if (result.success) {
            this.data.users = this.data.users.filter(u => u.id !== id);
            saveData(this.data);
            this.renderUsers();
            this.showToast('បានលុបអ្នកប្រើប្រាស់!', 'success');
        } else {
            this.showToast(result.message || 'កំហុសក្នុងការលុប!', 'error');
        }
    } catch (error) {
        console.error('User delete error:', error);
        this.showToast('មានកំហុសកើតឡើង!', 'error');
    }
};
