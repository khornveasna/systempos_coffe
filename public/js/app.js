// CoffeePOS – core class: constructor, init, bindEvents, navigate, utilities
// Prototype methods are added by the files loaded after this one.

class CoffeePOS {
    constructor() {
        this.data         = getData();
        this.cart         = [];
        this.currentPage  = 'pos';
        this.currentCategory = 'all';
        this.currentUser  = null;
        this.editingItem  = null;
        this.editingUser  = null;
        this.viewingOrder = null;
        this.socket       = null;
        this.onlineUsers  = new Map();
        this.init();
    }

    init() {
        this.initSocket();
        this.checkAuth();
        this.bindEvents();
        if (this.currentUser) this.showApp();
    }

    bindEvents() {
        // Auth
        document.getElementById('loginForm').addEventListener('submit', e => { e.preventDefault(); this.login(); });
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', e => { e.preventDefault(); this.navigate(item.dataset.page); });
        });

        // Category filter
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.category;
                this.renderProducts();
            });
        });

        // POS
        document.getElementById('searchProduct').addEventListener('input', () => this.renderProducts());
        document.getElementById('clearCartBtn').addEventListener('click', () => this.clearCart());
        document.getElementById('discountPercent').addEventListener('input', () => {
            document.getElementById('saleAmount').value = '';
            this.updateCartTotals();
        });
        document.getElementById('saleAmount').addEventListener('input', () => {
            document.getElementById('discountPercent').value = '';
            this.updateCartTotals();
        });
        document.getElementById('checkoutBtn').addEventListener('click', () => this.openCheckout());
        document.getElementById('confirmPaymentBtn').addEventListener('click', () => this.confirmPayment());
        document.getElementById('amountReceived').addEventListener('input', () => this.calculateChange());
        document.querySelectorAll('.payment-method').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.payment-method').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        document.getElementById('newOrderBtn').addEventListener('click', () => this.clearCart());

        // Items
        document.getElementById('addItemBtn').addEventListener('click', () => this.openItemModal());
        document.getElementById('itemForm').addEventListener('submit', e => { e.preventDefault(); this.saveItem(); });
        document.getElementById('searchItem').addEventListener('input', () => this.renderItems());
        document.getElementById('filterCategory').addEventListener('change', () => this.renderItems());
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        if (uploadPlaceholder) {
            uploadPlaceholder.addEventListener('click', () => document.getElementById('itemImageFile').click());
        }

        // Users
        document.getElementById('addUserBtn').addEventListener('click', () => this.openUserModal());
        document.getElementById('userForm').addEventListener('submit', e => { e.preventDefault(); this.saveUser(); });

        // Orders
        document.getElementById('orderDateFilter').addEventListener('change', () => this.renderOrders());
        document.getElementById('exportOrdersBtn').addEventListener('click', () => this.exportOrders());
        document.getElementById('printOrderBtn').addEventListener('click', () => this.printOrder());

        // Reports
        document.getElementById('generateReportBtn').addEventListener('click', () => this.generateReports());
        document.getElementById('reportPeriod').addEventListener('change', () => {
            const customRange = document.getElementById('customDateRange');
            if (document.getElementById('reportPeriod').value === 'custom') {
                customRange.classList.remove('hidden');
            } else {
                customRange.classList.add('hidden');
            }
            this.generateReports();
        });
        document.getElementById('customStartDate').addEventListener('change', () => this.generateReports());
        document.getElementById('customEndDate').addEventListener('change', () => this.generateReports());

        // Modals
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', e => { e.preventDefault(); this.closeAllModals(); });
        });
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', e => { if (e.target === modal) this.closeAllModals(); });
        });
    }

    navigate(page) {
        if (this.currentUser.role !== 'admin') {
            const perms = this.currentUser.permissions || [];
            if (page === 'items'   && !perms.includes('items'))   { this.showToast('អ្នកមិនមានសិទ្ធិចូលមើលផ្នែកនេះទេ!', 'error'); return; }
            if (page === 'orders'  && !perms.includes('orders'))  { this.showToast('អ្នកមិនមានសិទ្ធិចូលមើលផ្នែកនេះទេ!', 'error'); return; }
            if (page === 'reports' && !perms.includes('reports')) { this.showToast('អ្នកមិនមានសិទ្ធិចូលមើលផ្នែកនេះទេ!', 'error'); return; }
            if (page === 'users')  { this.showToast('មានតែ Admin ទេដែលអាចចូលផ្នែកនេះ!', 'error'); return; }
        }

        this.currentPage = page;

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        document.querySelectorAll('.page').forEach(p => {
            p.classList.add('hidden');
            p.classList.remove('active');
        });
        document.getElementById(page + 'Page').classList.remove('hidden');
        document.getElementById(page + 'Page').classList.add('active');

        switch (page) {
            case 'pos':     this.renderProducts();  break;
            case 'items':   this.renderItems();     break;
            case 'orders':  this.renderOrders();    break;
            case 'reports': this.generateReports(); break;
            case 'users':   this.renderUsers();     break;
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        this.viewingOrder = null;
    }

    showToast(message, type = 'success') {
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle' };
        const toast = document.getElementById('toast');
        toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
        toast.className = `toast ${type}`;
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }
}
