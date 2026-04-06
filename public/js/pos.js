// POS: products grid, cart, checkout, print receipt

CoffeePOS.prototype.renderProducts = function () {
    const grid       = document.getElementById('productsGrid');
    const searchTerm = document.getElementById('searchProduct').value.toLowerCase();
    let   products   = this.data.products.filter(p => p.active);

    if (this.currentCategory !== 'all') {
        products = products.filter(p => p.category === this.currentCategory);
    }
    if (searchTerm) {
        products = products.filter(p => p.name.toLowerCase().includes(searchTerm));
    }

    if (products.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-light);">
                <i class="fas fa-search" style="font-size:48px;margin-bottom:15px;opacity:0.3;"></i>
                <p>គ្មានមុខម្ហូបត្រូវនឹងការស្វែងរក</p>
            </div>`;
        return;
    }

    grid.innerHTML = products.map(p => {
        const hasSale = p.salePrice && p.salePrice > 0;
        return `
            <div class="product-card" data-id="${p.id}" onclick="pos.addToCart(${p.id})">
                ${p.image ? `<img src="${p.image}" alt="${p.name}">` : `<div class="product-icon"><i class="fas ${p.icon}"></i></div>`}
                <h3>${p.name}</h3>
                ${hasSale
                    ? `<div class="original-price">${formatCurrency(p.price)}</div><div class="sale-price">${formatCurrency(p.salePrice)}</div>`
                    : `<div class="price">${formatCurrency(p.price)}</div>`}
            </div>`;
    }).join('');
};

CoffeePOS.prototype.addToCart = function (productId) {
    const product = this.data.products.find(p => p.id === productId);
    if (!product) return;

    const existing = this.cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity++;
    } else {
        this.cart.push({
            id:            product.id,
            name:          product.name,
            price:         product.salePrice && product.salePrice > 0 ? product.salePrice : product.price,
            originalPrice: product.price,
            quantity:      1,
            image:         product.image,
            icon:          product.icon
        });
    }
    this.renderCart();
    this.showToast(`បានបន្ថែម ${product.name} ចូលរទេះ!`, 'success');
};

CoffeePOS.prototype.renderCart = function () {
    const cartItems = document.getElementById('cartItems');

    if (this.cart.length === 0) {
        cartItems.innerHTML = `<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>គ្មានមុខម្ហូបក្នុងរទេះ</p></div>`;
        document.getElementById('checkoutBtn').disabled = true;
    } else {
        cartItems.innerHTML = this.cart.map((item, i) => `
            <div class="cart-item">
                ${item.image ? `<img src="${item.image}" alt="${item.name}" class="cart-item-image">` : `<div class="cart-item-icon"><i class="fas ${item.icon}"></i></div>`}
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="cart-item-price">${formatCurrency(item.price)}</div>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="pos.decreaseQty(${i})">-</button>
                    <span class="cart-item-qty">${item.quantity}</span>
                    <button class="qty-btn" onclick="pos.increaseQty(${i})">+</button>
                    <button class="cart-item-remove" onclick="pos.removeFromCart(${i})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`).join('');
        document.getElementById('checkoutBtn').disabled = false;
    }

    document.getElementById('cartCount').textContent = `(${this.cart.reduce((s, i) => s + i.quantity, 0)})`;
    this.updateCartTotals();
};

CoffeePOS.prototype.increaseQty    = function (i) { this.cart[i].quantity++; this.renderCart(); };
CoffeePOS.prototype.removeFromCart = function (i) { this.cart.splice(i, 1); this.renderCart(); };
CoffeePOS.prototype.decreaseQty    = function (i) {
    if (this.cart[i].quantity > 1) { this.cart[i].quantity--; this.renderCart(); }
    else this.removeFromCart(i);
};

CoffeePOS.prototype.clearCart = function () {
    this.cart = [];
    document.getElementById('discountPercent').value = '';
    document.getElementById('saleAmount').value      = '';
    this.renderCart();
    this.showToast('បានសម្អាតរទេះ!', 'success');
};

CoffeePOS.prototype._calcDiscount = function () {
    const subtotal       = this.cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
    const saleAmount      = parseFloat(document.getElementById('saleAmount').value) || 0;
    let   discountAmount  = 0;
    if      (discountPercent > 0) discountAmount = subtotal * (discountPercent / 100);
    else if (saleAmount > 0)      discountAmount = Math.min(saleAmount, subtotal);
    return { subtotal, discountPercent, discountAmount, total: Math.max(0, subtotal - discountAmount) };
};

CoffeePOS.prototype.updateCartTotals = function () {
    const { subtotal, discountAmount, total } = this._calcDiscount();
    document.getElementById('subtotal').textContent       = formatCurrency(subtotal);
    document.getElementById('discountAmount').textContent = '-' + formatCurrency(discountAmount);
    document.getElementById('total').textContent          = formatCurrency(total);
};

CoffeePOS.prototype.openCheckout = function () {
    const { subtotal, discountPercent, discountAmount, total } = this._calcDiscount();

    document.getElementById('receiptNumber').textContent  = generateReceiptNumber();
    document.getElementById('receiptDate').textContent    = formatDate(new Date().toISOString());
    document.getElementById('receiptServer').textContent  = this.currentUser.fullname;
    document.getElementById('receiptItems').innerHTML     = this.cart.map(item => `
        <div class="receipt-item">
            <span class="receipt-item-name">${item.name}</span>
            <span class="receipt-item-qty">x${item.quantity}</span>
            <span class="receipt-item-price">${formatCurrency(item.price * item.quantity)}</span>
        </div>`).join('');
    document.getElementById('receiptSubtotal').textContent        = formatCurrency(subtotal);
    document.getElementById('receiptDiscountPercent').textContent = discountPercent > 0 ? discountPercent + '%' : '0%';
    document.getElementById('receiptDiscountAmount').textContent  = formatCurrency(discountAmount);
    document.getElementById('receiptTotal').textContent           = formatCurrency(total);
    document.getElementById('amountReceived').value               = '';
    document.getElementById('changeAmount').textContent           = '0៛';

    document.getElementById('checkoutModal').classList.add('active');
};

CoffeePOS.prototype.calculateChange = function () {
    const { total } = this._calcDiscount();
    const received  = parseFloat(document.getElementById('amountReceived').value) || 0;
    const change    = received - total;
    document.getElementById('changeAmount').textContent = change >= 0 ? formatCurrency(change) : '0៛';
};

CoffeePOS.prototype.confirmPayment = async function () {
    const { subtotal, discountPercent, discountAmount, total } = this._calcDiscount();
    const received = parseFloat(document.getElementById('amountReceived').value) || 0;

    if (received < total && total > 0) {
        this.showToast('ចំនួនទទួលមិនគ្រប់គ្រាន់!', 'error');
        return;
    }

    const order = {
        receiptNumber: document.getElementById('receiptNumber').textContent,
        date:          new Date().toISOString(),
        items:         [...this.cart],
        subtotal,
        discountPercent,
        discountAmount,
        total,
        paymentMethod: document.querySelector('.payment-method.active').dataset.method,
        userId:        this.currentUser.id,
        userName:      this.currentUser.fullname
    };

    try {
        const response = await fetch('/api/orders', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(order)
        });
        const result = await response.json();

        if (result.success) {
            this.printReceipt();
            this.closeAllModals();
            this.clearCart();
            if (this.currentPage === 'orders') await this.renderOrders();
            this.showToast('ការទូទាត់ជោគជ័យ!', 'success');
        } else {
            this.showToast(result.message || 'កំហុសក្នុងការរក្សាទុកការលក់!', 'error');
        }
    } catch (error) {
        console.error('Order save error:', error);
        this.showToast('មានកំហុសកើតឡើង: ' + error.message, 'error');
    }
};

CoffeePOS.prototype.printReceipt = function () {
    const win     = window.open('', '', 'width=400,height=600');
    const content = document.querySelector('.receipt').innerHTML;
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>
        body{font-family:'Courier New',monospace;padding:20px;margin:0}
        .receipt-row{display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px}
        .receipt-row.total{font-weight:bold;font-size:18px;border-top:2px solid #000;padding-top:10px;margin-top:10px}
        .receipt-item{display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px}
    </style></head><body><div class="receipt">${content}</div></body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 250);
};
