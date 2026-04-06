// Users: list, open modal, save, delete

CoffeePOS.prototype.renderUsers = async function () {
    if (this.currentUser.role !== 'admin') {
        document.getElementById('usersPage').classList.add('hidden');
        return;
    }

    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;">កំពុងទាញយកទិន្នន័យ...</td></tr>';

    try {
        const result = await fetch(
            `/api/users?userId=${this.currentUser.id}&userRole=${this.currentUser.role}`
        ).then(r => r.json());

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-light);">${result.message || 'មិនអាចទាញយកទិន្នន័យបានទេ!'}</td></tr>`;
            this.showToast(result.message || 'មិនអាចទាញយកទិន្នន័យបានទេ!', 'error');
            return;
        }

        const users = result.users;
        this.data.users = users;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-light);">គ្មានអ្នកប្រើប្រាស់</td></tr>';
            return;
        }

        const roleNames = { admin: 'Admin', manager: 'អ្នកគ្រប់គ្រង', staff: 'បុគ្គលិក' };

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.fullname}</td>
                <td><span class="role-badge ${user.role}">${roleNames[user.role]}</span></td>
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
            </tr>`).join('');
    } catch (error) {
        console.error('Render users error:', error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-light);">កំហុស: ${error.message}</td></tr>`;
        this.showToast('កំហុសក្នុងការទាញយកទិន្នន័យ: ' + error.message, 'error');
    }
};

CoffeePOS.prototype.openUserModal = function (userId = null) {
    if (this.currentUser.role !== 'admin') {
        this.showToast('មានតែ Admin ទេដែលអាចគ្រប់គ្រងអ្នកប្រើប្រាស់!', 'error');
        return;
    }

    const modal = document.getElementById('userModal');
    const form  = document.getElementById('userForm');
    form.reset();
    document.getElementById('userPassword').required   = !userId;
    document.getElementById('passwordNote').style.display = userId ? 'block' : 'none';

    if (userId) {
        const user = this.data.users.find(u => u.id === userId);
        if (user) {
            this.editingUser = user;
            document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-edit"></i> កែសម្រួលអ្នកប្រើប្រាស់';
            document.getElementById('userId').value       = user.id;
            document.getElementById('userUsername').value = user.username;
            document.getElementById('userFullname').value = user.fullname;
            document.getElementById('userPassword').value = '';
            document.getElementById('userRole').value     = user.role;
            const perms = user.permissions || [];
            document.getElementById('permPOS').checked     = perms.includes('pos');
            document.getElementById('permItems').checked   = perms.includes('items');
            document.getElementById('permOrders').checked  = perms.includes('orders');
            document.getElementById('permReports').checked = perms.includes('reports');
        }
    } else {
        this.editingUser = null;
        document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-plus"></i> បន្ថែមអ្នកប្រើប្រាស់';
        document.getElementById('userId').value = '';
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

    const permissions = [];
    if (document.getElementById('permPOS').checked)     permissions.push('pos');
    if (document.getElementById('permItems').checked)   permissions.push('items');
    if (document.getElementById('permOrders').checked)  permissions.push('orders');
    if (document.getElementById('permReports').checked) permissions.push('reports');
    if (role === 'admin') {
        permissions.length = 0;
        permissions.push('pos', 'items', 'orders', 'reports', 'users');
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
            this.applyUserPermissions();
            this.showToast('សិទ្ធិប្រើប្រាស់ត្រូវបានធ្វើបច្ចុប្បន្នភាព! ប្រព័ន្ធនឹងផ្ទុកឡើងវិញ...', 'success');
            setTimeout(() => location.reload(), 1500);
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
    if (!confirm('តើអ្នកចង់លុបអ្នកប្រើប្រាស់នេះទេ?')) return;

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
