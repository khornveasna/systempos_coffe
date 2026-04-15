// Authentication: login, logout, checkAuth, showApp, permissions

CoffeePOS.prototype.checkAuth = function () {
    this.currentUser = getCurrentUser();
    
    if (this.currentUser) {
        document.getElementById('currentUser').textContent = this.currentUser.fullname;
        if (this.currentUser.role === 'admin') {
            this.currentUser.permissions = ['pos', 'items', 'orders', 'reports', 'users'];
        }
        this.displayUserPermissions();
    }
};

CoffeePOS.prototype.getPageStorageKey = function () {
    if (!this.currentUser) return 'coffeePOSLastPage:guest';
    return `coffeePOSLastPage:${this.currentUser.id || this.currentUser.username || 'user'}`;
};

CoffeePOS.prototype.getSavedPage = function () {
    return localStorage.getItem(this.getPageStorageKey()) || 'pos';
};

CoffeePOS.prototype.getItemsViewStorageKey = function () {
    if (!this.currentUser) return 'coffeePOSItemsView:guest';
    return `coffeePOSItemsView:${this.currentUser.id || this.currentUser.username || 'user'}`;
};

CoffeePOS.prototype.getSavedItemsViewState = function () {
    try {
        const raw = localStorage.getItem(this.getItemsViewStorageKey());
        if (!raw) return { view: 'categories', categoryId: 'all' };
        const parsed = JSON.parse(raw);
        return {
            view: parsed.view === 'items' ? 'items' : 'categories',
            categoryId: parsed.categoryId || 'all'
        };
    } catch {
        return { view: 'categories', categoryId: 'all' };
    }
};

CoffeePOS.prototype.saveItemsViewState = function () {
    if (!this.currentUser) return;
    const state = {
        view: this.currentItemsView === 'items' ? 'items' : 'categories',
        categoryId: this.currentItemsCategory || 'all'
    };
    localStorage.setItem(this.getItemsViewStorageKey(), JSON.stringify(state));
};

CoffeePOS.prototype.saveCurrentPage = function () {
    if (!this.currentUser) return;
    localStorage.setItem(this.getPageStorageKey(), this.currentPage);
};

CoffeePOS.prototype.getStartPage = function () {
    const perms = this.currentUser?.permissions || [];
    const isAdmin = this.currentUser?.role === 'admin';
    const savedPage = this.getSavedPage();

    const canOpen = page => isAdmin || perms.includes(page);
    if (canOpen(savedPage)) return savedPage;

    return ['pos', 'items', 'orders', 'reports', 'users'].find(page => canOpen(page)) || 'pos';
};

CoffeePOS.prototype.displayUserPermissions = function () {
    const permLabel = document.getElementById('userPermissions');
    if (!permLabel) return;

    if (this.currentUser.role === 'admin') {
        permLabel.innerHTML = '<span style="color: var(--primary);">✓ Admin (Full Access)</span>';
        return;
    }

    const icons = {
        pos:     '<i class="fas fa-cash-register" title="លក់"></i>',
        items:   '<i class="fas fa-box"           title="គ្រប់គ្រងមុខម្ហូប"></i>',
        orders:  '<i class="fas fa-receipt"       title="មើលការលក់"></i>',
        reports: '<i class="fas fa-chart-line"    title="របាយការណ៍"></i>'
    };
    permLabel.innerHTML = (this.currentUser.permissions || []).map(p => icons[p] || '').join(' ');
};

CoffeePOS.prototype.applyUserPermissions = function () {
    const perms   = this.currentUser.permissions || [];
    const isAdmin = this.currentUser.role === 'admin';

    this.displayUserPermissions();

    const toggle = (selector, show) => {
        const el = typeof selector === 'string' && selector.startsWith('#')
            ? document.getElementById(selector.slice(1))
            : document.querySelector(selector);
        if (el) el.classList.toggle('hidden', !show);
    };

    // Toggle menu items based on permissions
    toggle('[data-page="items"]',   isAdmin || perms.includes('items'));
    toggle('[data-page="orders"]',  isAdmin || perms.includes('orders'));
    toggle('[data-page="reports"]', isAdmin || perms.includes('reports'));
    toggle('#usersNav',             isAdmin || perms.includes('users'));
    toggle('#settingsNav',          isAdmin || perms.includes('settings'));

    if (!perms.includes('pos') && !isAdmin) {
        const firstPage = ['items', 'orders', 'reports'].find(p => perms.includes(p));
        if (firstPage && this.currentPage === 'pos') this.navigate(firstPage);
    }
};

CoffeePOS.prototype.showApp = async function () {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appScreen').classList.remove('hidden');

    // Load exchange rate from settings
    try {
        await new Promise(resolve => setTimeout(resolve, 100));
        const settingsRes = await fetch('/api/settings');
        
        if (settingsRes.ok) {
            const contentType = settingsRes.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const result = await settingsRes.json();
                const settingsData = result.settings || {};
                
                if (settingsData.exchangeRate) {
                    setExchangeRate(settingsData.exchangeRate);
                    enableDualCurrency();
                } else {
                    setExchangeRate(4000);
                    enableDualCurrency();
                }
            } else {
                setExchangeRate(4000);
                enableDualCurrency();
            }
        } else {
            setExchangeRate(4000);
            enableDualCurrency();
        }
    } catch (error) {
        setExchangeRate(4000);
        enableDualCurrency();
    }

    const savedItemsView = typeof this.getSavedItemsViewState === 'function'
        ? this.getSavedItemsViewState()
        : { view: 'categories', categoryId: 'all' };
    this.currentItemsView = savedItemsView.view;
    this.currentItemsCategory = savedItemsView.categoryId;
    if (typeof this.renderCategoryControls === 'function') {
        this.renderCategoryControls();
    }
    this.navigate(this.getStartPage());
    this.applyUserPermissions();
    if (this.socket && this.currentUser) {
        this.socket.emit('user-login', this.currentUser);
    }
    
    if (this.currentPage === 'pos') {
        this.renderCart();
    }
};

CoffeePOS.prototype.login = async function () {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, password })
        });
        const result = await response.json();

        if (result.success) {
            this.currentUser = result.user;
            setCurrentUser(result.user);
            document.getElementById('currentUser').textContent = result.user.fullname;
            this.showToast('ការចូលប្រើប្រាស់ជោគជ័យ!', 'success');
            this.showApp();
        } else {
            this.showToast(result.message || 'ឈ្មោះអ្នកប្រើប្រាស់ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ!', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        this.showToast('មិនអាចភ្ជាប់ទៅសែរវើរបានទេ!', 'error');
    }
};

CoffeePOS.prototype.logout = function () {
    if (this.socket && this.currentUser) this.socket.emit('user-logout');
    this.currentUser = null;
    setCurrentUser(null);
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appScreen').classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    this.showToast('បានចាកចេញ!', 'success');
};
