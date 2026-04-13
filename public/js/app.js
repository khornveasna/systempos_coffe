// CoffeePOS – core class: constructor, init, bindEvents, navigate, utilities
// Prototype methods are added by the files loaded after this one.

class CoffeePOS {
    constructor() {
        this.data         = getData();
        this.cart         = [];
        this.currentPage  = 'pos';
        this.currentCategory = 'all';
        this.currentItemsCategory = 'all';
        this.currentItemsView = 'categories';
        this.currentUser  = null;
        this.editingItem  = null;
        this.editingUser  = null;
        this.viewingOrder = null;
        this.socket       = null;
        this.onlineUsers  = new Map();
        this.settingsModule = null;
        this.init();
    }

    init() {
        // Initialize settings module to load logo on startup
        if (typeof SettingsModule !== 'undefined') {
            this.settingsModule = new SettingsModule(this);
        }
        
        this.initSocket();
        this.checkAuth();
        
        // Double-check localStorage for saved session
        if (!this.currentUser) {
            try {
                const rawUser = localStorage.getItem('coffeePOSUser');
                if (rawUser) {
                    this.currentUser = JSON.parse(rawUser);
                }
            } catch (e) {
                localStorage.removeItem('coffeePOSUser');
            }
        }
        
        // Show appropriate screen based on authentication
        if (this.currentUser) {
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('appScreen').classList.remove('hidden');
            this.syncAndShowApp();
        } else {
            document.getElementById('loginScreen').classList.remove('hidden');
            document.getElementById('appScreen').classList.add('hidden');
        }
        
        this.bindEvents();
    }

    async syncAndShowApp() {
        try {
            this.data = await syncDataFromAPI();
        } catch (error) {
            console.error('Failed to sync data:', error);
        }
        this.showApp();
    }

    bindEvents() {
        // Auth
        document.getElementById('loginForm').addEventListener('submit', e => { e.preventDefault(); this.login(); });
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // POS category filter
        const categoryButtons = document.getElementById('categoryButtons');
        if (categoryButtons) {
            categoryButtons.addEventListener('click', event => {
                const button = event.target.closest('.category-btn');
                if (!button) return;

                categoryButtons.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                this.currentCategory = button.dataset.category;
                if (typeof button.scrollIntoView === 'function') {
                    button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
                if (typeof this.updateCategoryIndicator === 'function') {

            const itemsCategoryButtons = document.getElementById('itemsCategoryButtons');
            if (itemsCategoryButtons) {
                itemsCategoryButtons.addEventListener('click', event => {
                    const button = event.target.closest('.category-btn');
                    if (!button) return;

                    itemsCategoryButtons.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                    button.classList.add('active');
                    this.currentItemsCategory = button.dataset.category;

                    const filterCategory = document.getElementById('filterCategory');
                    if (filterCategory) filterCategory.value = this.currentItemsCategory;

                    if (typeof button.scrollIntoView === 'function') {
                        button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }
                    if (typeof this.updateCategoryIndicator === 'function') {
                        this.updateCategoryIndicator('itemsCategoryButtons');
                    }
                    if (typeof this.saveItemsViewState === 'function') {
                        this.saveItemsViewState();
                    }
                    this.renderItems();
                });

                itemsCategoryButtons.addEventListener('wheel', event => {
                    if (!event.deltaY) return;
                    event.preventDefault();
                    itemsCategoryButtons.scrollLeft += event.deltaY;
                }, { passive: false });
            }
                    this.updateCategoryIndicator();
                }
                this.renderProducts();
            });
                    this.updateCategoryIndicator('itemsCategoryButtons');

            categoryButtons.addEventListener('wheel', event => {
                if (!event.deltaY) return;
                event.preventDefault();
                categoryButtons.scrollLeft += event.deltaY;
            }, { passive: false });
        }

        window.addEventListener('resize', () => {
            if (typeof this.updateCategoryIndicator === 'function') {
                this.updateCategoryIndicator();
                this.updateCategoryIndicator('itemsCategoryButtons');
            }
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', e => { e.preventDefault(); this.navigate(item.dataset.page); });
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
        document.getElementById('addCategoryBtn').addEventListener('click', () => this.openCategoryModal());
        document.getElementById('addItemBtn').addEventListener('click', () => this.openItemModal());

        const itemsCategoryButtons = document.getElementById('itemsCategoryButtons');
        if (itemsCategoryButtons) {
            itemsCategoryButtons.addEventListener('click', event => {
                const button = event.target.closest('.category-btn');
                if (!button || typeof this.setItemsView !== 'function') return;

                this.setItemsView('items', button.dataset.category || 'all');
            });

            itemsCategoryButtons.addEventListener('wheel', event => {
                if (!event.deltaY) return;
                event.preventDefault();
                itemsCategoryButtons.scrollLeft += event.deltaY;
            }, { passive: false });
        }

        document.querySelectorAll('.items-view-btn').forEach(button => {
            button.addEventListener('click', () => {
                if (typeof this.setItemsView === 'function') {
                    this.setItemsView(button.dataset.itemsView);
                }
            });
        });
        const itemsCategoriesList = document.getElementById('itemsCategoriesList');
        if (itemsCategoriesList) {
            itemsCategoriesList.addEventListener('click', event => {
                const editButton = event.target.closest('.category-list-edit');
                if (editButton) {
                    const { categoryId } = editButton.dataset;
                    if (typeof this.openCategoryModal === 'function') {
                        this.openCategoryModal(categoryId);
                    }
                    return;
                }

                const card = event.target.closest('.category-list-card');
                if (!card) return;

                if (typeof this.setItemsView === 'function') {
                    this.setItemsView('items', card.dataset.category || 'all');
                }
            });
        }
        document.getElementById('itemForm').addEventListener('submit', e => { e.preventDefault(); this.saveItem(); });
        document.getElementById('categoryForm').addEventListener('submit', e => { e.preventDefault(); this.saveCategory(); });
        document.getElementById('searchItem').addEventListener('input', () => this.renderItems());
        document.getElementById('filterCategory').addEventListener('change', () => this.renderItems());
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        if (uploadPlaceholder) {
            uploadPlaceholder.addEventListener('click', () => document.getElementById('itemImageFile').click());
        }

        // Users
        document.getElementById('addUserBtn').addEventListener('click', () => this.openUserModal().catch(console.error));
        document.getElementById('userForm').addEventListener('submit', e => { e.preventDefault(); this.saveUser(); });

        // Orders
        document.getElementById('orderStartDate').addEventListener('change', () => this.renderOrders());
        document.getElementById('orderEndDate').addEventListener('change', () => this.renderOrders());
        document.getElementById('orderSellerFilter').addEventListener('change', () => this.renderOrders());

        // Initialize export dropdown
        this.initExportDropdown();

        document.getElementById('printOrderBtn').addEventListener('click', () => this.printOrder());

        // Reports
        document.getElementById('customStartDate').addEventListener('change', () => this.generateReports());
        document.getElementById('customEndDate').addEventListener('change', () => this.generateReports());

        // Modals — close only the specific modal that was triggered, not all
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                const parentModal = btn.closest('.modal');
                if (parentModal) {
                    parentModal.classList.remove('active');
                    // If dismissing the confirm dialog, cancel the pending action
                    if (parentModal.id === 'confirmModal' &&
                        typeof this.resolveConfirmDialog === 'function') {
                        this.resolveConfirmDialog(false);
                    }
                } else {
                    this.closeAllModals();
                }
            });
        });
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', e => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    // If dismissing the confirm dialog via backdrop, cancel the pending action
                    if (modal.id === 'confirmModal' &&
                        typeof this.resolveConfirmDialog === 'function') {
                        this.resolveConfirmDialog(false);
                    }
                }
            });
        });

        const confirmModalConfirmBtn = document.getElementById('confirmModalConfirmBtn');
        if (confirmModalConfirmBtn) {
            confirmModalConfirmBtn.addEventListener('click', () => {
                if (typeof this.resolveConfirmDialog === 'function') {
                    this.resolveConfirmDialog(true);
                }
                this.closeAllModals();
            });
        }

        // Mobile sidebar toggle
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const closeSidebarBtn = document.getElementById('closeSidebarBtn');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const sidebar = document.querySelector('.sidebar');
        
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => this.toggleSidebar());
        }
        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', () => this.toggleSidebar());
        }
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Mobile cart toggle
        const mobileCartToggle = document.getElementById('mobileCartToggle');
        if (mobileCartToggle) {
            mobileCartToggle.addEventListener('click', () => this.toggleCart());
        }
        
        // Close sidebar when clicking nav items on mobile
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth < 768) {
                    this.toggleSidebar();
                }
            });
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
            case 'pos':
                if (typeof this.renderCategoryControls === 'function') this.renderCategoryControls();
                this.renderProducts();
                break;
            case 'items':
                if (typeof this.renderCategoryControls === 'function') this.renderCategoryControls();
                if (typeof this.getSavedItemsViewState === 'function') {
                    const savedItemsView = this.getSavedItemsViewState();
                    this.currentItemsView = savedItemsView.view;
                    this.currentItemsCategory = savedItemsView.categoryId;
                }
                this.renderItems();
                break;
            case 'orders':
                this.populateSellerFilter();
                this.renderOrders();
                this.initQuickDateFilter();
                break;
            case 'reports':
                this.generateReports();
                this.initReportDateFilter();
                break;
            case 'users':   this.renderUsers();     break;
            case 'settings': if (this.settingsModule) this.settingsModule.loadSettings(); break;
        }

        if (typeof this.saveCurrentPage === 'function') {
            this.saveCurrentPage();
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        if (typeof this.resolveConfirmDialog === 'function' && this.pendingConfirmDialog) {
            this.resolveConfirmDialog(false);
        }
        this.viewingOrder = null;
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        
        if (!sidebar || !overlay || !mobileMenuToggle) return;
        
        const isActive = sidebar.classList.toggle('active');
        
        if (isActive) {
            overlay.classList.add('active');
            mobileMenuToggle.classList.add('hidden');
        } else {
            overlay.classList.remove('active');
            mobileMenuToggle.classList.remove('hidden');
        }
    }

    toggleCart() {
        const cartSection = document.querySelector('.cart-section');
        if (!cartSection) return;
        
        cartSection.classList.toggle('active');
    }

    updateCartBadge() {
        const badge = document.getElementById('cartBadge');
        if (!badge) return;
        
        const totalItems = this.cart.reduce((sum, item) => sum + item.qty, 0);
        badge.textContent = totalItems;
        
        // Show/hide badge based on count
        if (totalItems > 0) {
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    showToast(message, type = 'success') {
        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation' };
        const titles = { success: 'ជោគជ័យ', error: 'មានបញ្ហា', warning: 'ព្រមាន' };
        const toast = document.getElementById('toast');
        if (!toast) return;

        clearTimeout(this.toastTimer);
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
            <div class="toast-content">
                <strong class="toast-title">${titles[type]}</strong>
                <span class="toast-message">${message}</span>
            </div>
        `;

        // Restart the entrance animation when the toast content changes.
        toast.classList.remove('show');
        void toast.offsetWidth;
        toast.classList.add('show');
        this.toastTimer = setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hidden');
        }, 3000);
    }

    showConfirmDialog(message, options = {}) {
        const modal = document.getElementById('confirmModal');
        const title = document.getElementById('confirmModalTitle');
        const body = document.getElementById('confirmModalMessage');
        const confirmBtn = document.getElementById('confirmModalConfirmBtn');

        if (!modal || !title || !body || !confirmBtn) {
            return Promise.resolve(window.confirm(message));
        }

        if (this.pendingConfirmDialog) {
            this.resolveConfirmDialog(false);
        }

        title.innerHTML = `<i class="fas ${options.icon || 'fa-triangle-exclamation'}"></i> ${options.title || 'បញ្ជាក់សកម្មភាព'}`;
        body.textContent = message;
        confirmBtn.innerHTML = `<i class="fas ${options.confirmIcon || 'fa-check'}"></i> ${options.confirmText || 'បញ្ជាក់'}`;
        confirmBtn.className = `btn-confirm ${options.confirmClass || ''}`.trim();

        modal.classList.add('active');

        return new Promise(resolve => {
            this.pendingConfirmDialog = resolve;
            this.resolveConfirmDialog = result => {
                const pending = this.pendingConfirmDialog;
                this.pendingConfirmDialog = null;
                this.resolveConfirmDialog = null;
                if (pending) pending(result);
            };
        });
    }
}
