// Items (product) management

CoffeePOS.prototype.renderItems = function () {
    const grid        = document.getElementById('itemsGrid');
    const searchTerm  = document.getElementById('searchItem').value.toLowerCase();
    const filterCat   = document.getElementById('filterCategory').value;
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
                    <span class="category-tag">${categoryNames[item.category]}</span>
                    <h3>${item.name}</h3>
                    <div class="price-row">
                        ${hasSale
                            ? `<span class="sale-price">${formatCurrency(item.salePrice)}</span><span class="original-price">${formatCurrency(item.price)}</span>`
                            : `<span class="price">${formatCurrency(item.price)}</span>`}
                    </div>
                    <div class="item-card-actions">
                        <button class="btn-edit-item"   onclick="pos.openItemModal(${item.id})"><i class="fas fa-edit"></i> កែសម្រួល</button>
                        <button class="btn-delete-item" onclick="pos.deleteItem(${item.id})"><i class="fas fa-trash"></i> លុប</button>
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
        const item = this.data.products.find(p => p.id === itemId);
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

CoffeePOS.prototype.saveItem = function () {
    const id          = document.getElementById('itemId').value;
    const name        = document.getElementById('itemName').value;
    const category    = document.getElementById('itemCategory').value;
    const price       = parseFloat(document.getElementById('itemPrice').value);
    const salePrice   = parseFloat(document.getElementById('itemSalePrice').value) || 0;
    const description = document.getElementById('itemDescription').value;
    const active      = document.getElementById('itemActive').checked;
    const image       = document.getElementById('itemImage').value;

    if (id) {
        const item = this.data.products.find(p => p.id === parseInt(id));
        if (item) {
            Object.assign(item, { name, category, price, salePrice, description, active, image });
            this.showToast('បានកែសម្រួលមុខម្ហូប!', 'success');
        }
    } else {
        this.data.products.push({ id: generateId(), name, category, price, salePrice, description, active, image, icon: categoryIcons[category] || 'fa-utensils' });
        this.showToast('បានបន្ថែមមុខម្ហូប!', 'success');
    }

    saveData(this.data);
    this.closeAllModals();
    this.renderItems();
};

CoffeePOS.prototype.deleteItem = function (id) {
    if (confirm('តើអ្នកចង់លុបមុខម្ហូបនេះទេ?')) {
        this.data.products = this.data.products.filter(p => p.id !== id);
        saveData(this.data);
        this.renderItems();
        this.showToast('បានលុបមុខម្ហូប!', 'success');
    }
};
