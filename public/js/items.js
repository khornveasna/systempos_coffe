// Items (product) management

CoffeePOS.prototype.renderCategoryControls = function () {
    const categories = this.data.categories || [];
    const categoryButtons = document.getElementById('categoryButtons');
    const itemsCategoryButtons = document.getElementById('itemsCategoryButtons');
    const itemCategory = document.getElementById('itemCategory');
    const filterCategory = document.getElementById('filterCategory');

    const renderMenu = (container, activeCategory) => {
        if (!container) return;

        container.innerHTML = [
            `<span class="category-indicator" aria-hidden="true"></span>`,
            `<button class="category-btn ${activeCategory === 'all' ? 'active' : ''}" data-category="all">
                <i class="fas fa-th"></i> ទាំងអស់
            </button>
        `].concat(categories.map(category => `
            <button class="category-btn ${activeCategory === category.id ? 'active' : ''}" data-category="${category.id}">
                <i class="fas ${category.icon || 'fa-tag'}"></i> ${category.name}
            </button>
        `)).join('');

        this.updateCategoryIndicator(container.id);
    };

    renderMenu(categoryButtons, this.currentCategory || 'all');
    renderMenu(itemsCategoryButtons, this.currentItemsCategory || 'all');

    if (itemCategory) {
        itemCategory.innerHTML = [`<option value="">ជ្រើសរើសប្រភេទ</option>`].concat(categories.map(category => `
            <option value="${category.id}">${category.name}</option>
        `)).join('');
    }

    if (filterCategory) {
        filterCategory.innerHTML = [`<option value="all">គ្រប់ប្រភេទ</option>`].concat(categories.map(category => `
            <option value="${category.id}">${category.name}</option>
        `)).join('');
        filterCategory.value = this.currentItemsCategory || 'all';
    }
};

CoffeePOS.prototype.renderCategoryOverview = function () {
    const list = document.getElementById('itemsCategoriesList');
    if (!list) return;

    const categories = this.data.categories || [];
    const totalCount = this.data.products.length;

    if (!categories.length) {
        list.innerHTML = `
            <div class="empty-state empty-state-card">
                <i class="fas fa-tags"></i>
                <p>មិនទាន់មានប្រភេទ</p>
            </div>`;
        return;
    }

    const countByCategory = categories.reduce((map, category) => {
        map[category.id] = this.data.products.filter(product => product.category === category.id).length;
        return map;
    }, {});

    list.innerHTML = [
        `<div class="category-list-card ${this.currentItemsCategory === 'all' ? 'active' : ''}" data-category="all" role="button" tabindex="0">`
        + `<div class="category-list-icon"><i class="fas fa-th"></i></div>`
        + `<div class="category-list-body"><strong>ទាំងអស់</strong><span>${totalCount} មុខម្ហូប</span></div>`
        + `<i class="fas fa-chevron-right category-list-chevron"></i></div>`
    ].concat(categories.map(category => `
        <div class="category-list-card ${this.currentItemsCategory === category.id ? 'active' : ''}" data-category="${category.id}" role="button" tabindex="0">
            <div class="category-list-icon"><i class="fas ${category.icon || 'fa-tag'}"></i></div>
            <div class="category-list-body">
                <strong>${category.name}</strong>
                <span>${countByCategory[category.id] || 0} មុខម្ហូប</span>
            </div>
            <button type="button" class="category-list-edit" data-action="edit-category" data-category-id="${category.id}" aria-label="កែសម្រួលប្រភេទ ${category.name}">
                <i class="fas fa-pen"></i>
            </button>
            <i class="fas fa-chevron-right category-list-chevron"></i>
        </div>
    `)).join('');
};

CoffeePOS.prototype.updateCategoryIndicator = function (containerId = 'categoryButtons') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const indicator = container.querySelector('.category-indicator');
    const activeButton = container.querySelector('.category-btn.active');
    if (!indicator || !activeButton) return;

    indicator.style.width = `${activeButton.offsetWidth}px`;
    indicator.style.height = `${activeButton.offsetHeight}px`;
    indicator.style.transform = `translate(${activeButton.offsetLeft}px, ${activeButton.offsetTop}px)`;
};

CoffeePOS.prototype.openCategoryModal = function (categoryId = '') {
    const categories = this.data.categories || [];
    const category = categoryId ? categories.find(item => String(item.id) === String(categoryId)) : null;

    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = category ? category.id : '';
    document.getElementById('categoryModalTitle').innerHTML = category
        ? '<i class="fas fa-pen"></i> កែសម្រួលប្រភេទ'
        : '<i class="fas fa-tags"></i> បន្ថែមប្រភេទ';
    document.getElementById('categoryName').value = category ? category.name : '';
    document.getElementById('categoryIcon').value = category ? category.icon || 'fa-tag' : 'fa-tag';
    document.getElementById('categoryModal').classList.add('active');
};

CoffeePOS.prototype.saveCategory = async function () {
    const categoryId = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value.trim();
    const icon = document.getElementById('categoryIcon').value.trim() || 'fa-tag';

    if (!name) {
        this.showToast('សូមបញ្ចូលឈ្មោះប្រភេទ!', 'error');
        return;
    }

    try {
        let result;
        if (categoryId) {
            const res = await fetch(`/api/categories/${categoryId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, name_km: name, icon })
            });
            result = await res.json();
        } else {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, name_km: name, icon })
            });
            result = await res.json();
        }

        if (!result.success) {
            this.showToast(result.message || 'មិនអាចរក្សាទុកប្រភេទបានទេ!', 'error');
            return;
        }

        // Refresh categories from API
        const catRes = await fetch('/api/categories').then(r => r.json());
        if (catRes.success) {
            this.data.categories = catRes.categories;
            saveData(this.data);
        }

        syncCategoryLookups(this.data.categories);
        this.renderCategoryControls();
        this.closeAllModals();
        if (this.currentPage === 'items') this.renderItems();
        if (this.currentPage === 'pos') this.renderProducts();
        this.showToast(categoryId ? 'បានកែសម្រួលប្រភេទ!' : 'បានបន្ថែមប្រភេទថ្មី!', 'success');
    } catch (error) {
        console.error('Save category error:', error);
        this.showToast('កំហុសក្នុងការរក្សាទុក: ' + error.message, 'error');
    }
};

CoffeePOS.prototype.setItemsView = function (view, categoryId = 'all') {
    this.currentItemsView = view === 'items' ? 'items' : 'categories';

    if (this.currentItemsView === 'items') {
        this.currentItemsCategory = categoryId || 'all';
    } else {
        this.currentItemsCategory = 'all';
    }

    const filterCategory = document.getElementById('filterCategory');
    if (filterCategory) {
        filterCategory.value = this.currentItemsView === 'items' ? this.currentItemsCategory : 'all';
    }

    if (typeof this.syncItemsCategoryMenu === 'function') {
        this.syncItemsCategoryMenu();
    }

    if (typeof this.saveItemsViewState === 'function') {
        this.saveItemsViewState();
    }

    this.renderItems();
};

CoffeePOS.prototype.syncItemsViewIndicator = function () {
    const switcher = document.querySelector('#itemsPage .items-view-switch');
    if (!switcher) return;

    const indicator = switcher.querySelector('.items-view-indicator');
    const activeButton = switcher.querySelector('.items-view-btn.active');
    if (!indicator || !activeButton) return;

    indicator.style.width = `${activeButton.offsetWidth}px`;
    indicator.style.height = `${activeButton.offsetHeight}px`;
    indicator.style.transform = `translate(${activeButton.offsetLeft}px, ${activeButton.offsetTop}px)`;
};

CoffeePOS.prototype.syncItemsCategoryMenu = function () {
    const container = document.getElementById('itemsCategoryButtons');
    if (!container) return;

    const buttons = container.querySelectorAll('.category-btn');
    buttons.forEach(button => {
        const isActive = button.dataset.category === this.currentItemsCategory;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');

        if (isActive && typeof button.scrollIntoView === 'function') {
            button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    });

    if (typeof this.updateCategoryIndicator === 'function') {
        this.updateCategoryIndicator('itemsCategoryButtons');
    }
};

CoffeePOS.prototype.renderItems = function () {
    const categoriesPanel = document.getElementById('itemsCategoriesPanel');
    const itemsPanel = document.getElementById('itemsItemsPanel');
    const viewButtons = document.querySelectorAll('.items-view-btn');

    viewButtons.forEach(button => {
        const isActive = button.dataset.itemsView === this.currentItemsView;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (typeof this.syncItemsViewIndicator === 'function') {
        this.syncItemsViewIndicator();
    }

    if (categoriesPanel) categoriesPanel.classList.toggle('hidden', this.currentItemsView !== 'categories');
    if (itemsPanel) itemsPanel.classList.toggle('hidden', this.currentItemsView === 'categories');

    if (this.currentItemsView === 'items' && typeof this.syncItemsCategoryMenu === 'function') {
        this.syncItemsCategoryMenu();
    }

    if (this.currentItemsView === 'categories') {
        if (typeof this.saveItemsViewState === 'function') {
            this.saveItemsViewState();
        }
        this.renderCategoryOverview();
        return;
    }

    const grid        = document.getElementById('itemsGrid');
    const searchInput  = document.getElementById('searchItem');
    const filterSelect = document.getElementById('filterCategory');
    const searchTerm   = searchInput ? searchInput.value.toLowerCase() : '';
    const filterCat    = filterSelect ? filterSelect.value : 'all';
    let   items       = this.data.products;

    if (filterCat !== 'all') items = items.filter(i => i.category === filterCat);
    if (searchTerm)          items = items.filter(i => i.name.toLowerCase().includes(searchTerm));

    if (items.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-light);">
                <i class="fas fa-box-open" style="font-size:48px;margin-bottom:15px;opacity:0.3;"></i>
                <p>គ្មានមុខម្ហូប</p>
            </div>`;
        return;
    }

    grid.innerHTML = items.map(item => {
        const hasSale = item.salePrice && item.salePrice > 0;
        return `
            <div class="item-card">
                ${item.image ? `<img src="${item.image}" alt="${item.name}" class="item-card-image">` : `<div class="item-card-icon"><i class="fas ${item.icon}"></i></div>`}
                <div class="item-card-body">
                    <span class="category-tag">${categoryNames[item.category] || item.category || '-'}</span>
                    <h3>${item.name}</h3>
                    <div class="price-row">
                        ${hasSale
                            ? `<span class="sale-price">${formatCurrency(item.salePrice)}</span><span class="original-price">${formatCurrency(item.price)}</span>`
                            : `<span class="price">${formatCurrency(item.price)}</span>`}
                    </div>
                    <div class="item-card-actions">
                        <button class="btn-edit-item"   onclick='pos.openItemModal(${JSON.stringify(item.id)})'><i class="fas fa-edit"></i> កែសម្រួល</button>
                        <button class="btn-delete-item" onclick='pos.deleteItem(${JSON.stringify(item.id)})'><i class="fas fa-trash"></i> លុប</button>
                    </div>
                </div>
            </div>`;
    }).join('');
};

CoffeePOS.prototype.openItemModal = function (itemId = null) {
    const modal = document.getElementById('itemModal');
    document.getElementById('itemForm').reset();
    document.getElementById('imagePreview').innerHTML      = '';
    document.getElementById('uploadPlaceholder').style.display = 'block';

    if (itemId) {
        const item = this.data.products.find(p => String(p.id) === String(itemId));
        if (item) {
            this.editingItem = item;
            document.getElementById('itemModalTitle').innerHTML = '<i class="fas fa-edit"></i> កែសម្រួលមុខម្ហូប';
            document.getElementById('itemId').value          = item.id;
            document.getElementById('itemName').value        = item.name;
            document.getElementById('itemCategory').value    = item.category;
            document.getElementById('itemPrice').value       = item.price;
            document.getElementById('itemSalePrice').value   = item.salePrice || '';
            document.getElementById('itemDescription').value = item.description || '';
            document.getElementById('itemActive').checked    = item.active;
            document.getElementById('itemImage').value       = item.image || '';
            if (item.image) {
                document.getElementById('imagePreview').innerHTML = `
                    <img src="${item.image}" alt="${item.name}">
                    <button type="button" class="remove-image" onclick="pos.removeImage()"><i class="fas fa-trash"></i></button>`;
                document.getElementById('uploadPlaceholder').style.display = 'none';
            }
        }
    } else {
        this.editingItem = null;
        document.getElementById('itemModalTitle').innerHTML = '<i class="fas fa-plus"></i> បន្ថែមមុខម្ហូប';
        document.getElementById('itemId').value = '';
    }
    modal.classList.add('active');
};

CoffeePOS.prototype.previewImage = function (input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const base64 = e.target.result;
        document.getElementById('itemImage').value = base64;
        document.getElementById('imagePreview').innerHTML = `
            <img src="${base64}" alt="Preview">
            <button type="button" class="remove-image" onclick="pos.removeImage()"><i class="fas fa-trash"></i></button>`;
        document.getElementById('uploadPlaceholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
};

CoffeePOS.prototype.removeImage = function () {
    document.getElementById('itemImage').value            = '';
    document.getElementById('itemImageFile').value        = '';
    document.getElementById('imagePreview').innerHTML     = '';
    document.getElementById('uploadPlaceholder').style.display = 'block';
};

CoffeePOS.prototype.saveItem = async function () {
    const id          = document.getElementById('itemId').value;
    const name        = document.getElementById('itemName').value.trim();
    const category    = document.getElementById('itemCategory').value;
    const price       = parseFloat(document.getElementById('itemPrice').value);
    const salePrice   = parseFloat(document.getElementById('itemSalePrice').value) || 0;
    const description = document.getElementById('itemDescription').value;
    const active      = document.getElementById('itemActive').checked;
    const image       = document.getElementById('itemImage').value;
    const icon        = categoryIcons[category] || 'fa-utensils';

    if (!name || isNaN(price)) {
        this.showToast('សូមបញ្ចូលឈ្មោះ និងតម្លៃ!', 'error');
        return;
    }

    try {
        let result;
        if (id) {
            const existing = this.data.products.find(p => String(p.id) === String(id));
            const res = await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, name_km: name,
                    category_id: category,
                    price, salePrice, description, active, image,
                    icon: image ? (existing?.icon || icon) : icon
                })
            });
            result = await res.json();
        } else {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, name_km: name,
                    category_id: category,
                    price, salePrice, description, active, image, icon
                })
            });
            result = await res.json();
        }

        if (!result.success) {
            this.showToast(result.message || 'មិនអាចរក្សាទុកមុខម្ហូបបានទេ!', 'error');
            return;
        }

        // Refresh products from API
        const prodRes = await fetch('/api/products').then(r => r.json());
        if (prodRes.success) {
            this.data.products = prodRes.products;
            saveData(this.data);
        }

        syncCategoryLookups(this.data.categories || []);
        this.closeAllModals();
        this.renderItems();
        this.showToast(id ? 'បានកែសម្រួលមុខម្ហូប!' : 'បានបន្ថែមមុខម្ហូប!', 'success');
    } catch (error) {
        console.error('Save item error:', error);
        this.showToast('កំហុសក្នុងការរក្សាទុក: ' + error.message, 'error');
    }
};

CoffeePOS.prototype.deleteItem = async function (id) {
    const confirmed = await this.showConfirmDialog('តើអ្នកចង់លុបមុខម្ហូបនេះទេ?', {
        title: 'លុបមុខម្ហូប',
        confirmText: 'លុប',
        confirmIcon: 'fa-trash',
        confirmClass: 'danger'
    });

    if (!confirmed) return;

    try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        const result = await res.json();

        if (!result.success) {
            this.showToast(result.message || 'មិនអាចលុបមុខម្ហូបបានទេ!', 'error');
            return;
        }

        this.data.products = this.data.products.filter(p => String(p.id) !== String(id));
        saveData(this.data);
        this.renderItems();
        this.showToast('បានលុបមុខម្ហូប!', 'success');
    } catch (error) {
        console.error('Delete item error:', error);
        this.showToast('កំហុសក្នុងការលុប: ' + error.message, 'error');
    }
};
