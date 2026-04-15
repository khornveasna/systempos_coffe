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
            <div class="product-card" data-id="${p.id}" onclick='pos.addToCart(${JSON.stringify(p.id)})'>
                ${p.image ? `<img src="${p.image}" alt="${p.name}">` : `<div class="product-icon"><i class="fas ${p.icon}"></i></div>`}
                <h3>${p.name}</h3>
                ${hasSale
                    ? `<div class="original-price">${formatCurrency(p.price)}</div><div class="sale-price">${formatCurrency(p.salePrice)}</div>`
                    : `<div class="price">${formatCurrency(p.price)}</div>`}
            </div>`;
    }).join('');
};

CoffeePOS.prototype.addToCart = function (productId) {
    const product = this.data.products.find(p => String(p.id) === String(productId));
    if (!product) return;

    // Open customization modal
    this.openCustomizationModal(product);
};

CoffeePOS.prototype.openCustomizationModal = function (product) {
    const modal = document.getElementById('customizationModal');
    if (!modal) {
        // Fallback: add directly to cart if modal doesn't exist
        this.addDirectToCart(product);
        return;
    }

    // Set product info
    document.getElementById('customProductName').textContent = product.name;
    document.getElementById('customProductPrice').textContent = formatCurrency(product.salePrice && product.salePrice > 0 ? product.salePrice : product.price);

    // Reset selections
    document.querySelectorAll('#customizationModal .option-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelector('[data-sugar="normal"]').classList.add('selected');
    document.querySelector('[data-ice="normal"]').classList.add('selected');

    // Store product temporarily
    this.pendingCustomization = product;

    // Show modal
    modal.classList.add('active');
};

CoffeePOS.prototype.addDirectToCart = function (product, sugarLevel = 'normal', iceLevel = 'normal') {
    const existing = this.cart.find(item => 
        item.id === product.id && 
        item.sugarLevel === sugarLevel && 
        item.iceLevel === iceLevel
    );
    
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
            icon:          product.icon,
            sugarLevel:    sugarLevel,
            iceLevel:      iceLevel
        });
    }
    this.renderCart();
    this.showToast(`បានបន្ថែម ${product.name} ចូលរទេះ!`, 'success');
};

CoffeePOS.prototype.confirmCustomization = function () {
    if (!this.pendingCustomization) return;

    const sugarBtn = document.querySelector('#customizationModal [data-sugar].selected');
    const iceBtn = document.querySelector('#customizationModal [data-ice].selected');

    const sugarLevel = sugarBtn ? sugarBtn.dataset.sugar : 'normal';
    const iceLevel = iceBtn ? iceBtn.dataset.ice : 'normal';

    this.addDirectToCart(this.pendingCustomization, sugarLevel, iceLevel);
    this.closeAllModals();
    this.pendingCustomization = null;
};

CoffeePOS.prototype.selectOption = function (button) {
    // Get the option group
    const optionGroup = button.parentElement;
    
    // Remove selected class from all buttons in this group
    optionGroup.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Add selected class to clicked button
    button.classList.add('selected');
};


CoffeePOS.prototype.renderCart = function () {
    const cartItems = document.getElementById('cartItems');

    if (this.cart.length === 0) {
        cartItems.innerHTML = `<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>គ្មានមុខម្ហូបក្នុងរទេះ</p></div>`;
        document.getElementById('checkoutBtn').disabled = true;
    } else {
        cartItems.innerHTML = this.cart.map((item, i) => {
            const sugarLabels = {
                'normal': 'ផ្អែមម្មតា',
                'less': 'ផ្អែមតិច',
                'none': 'មិនផ្អែម'
            };
            const iceLabels = {
                'normal': 'ទឹកកកធម្តា',
                'less': 'ទឹកកកតិច',
                'none': 'មិនដាក់ទឹកកក'
            };

            return `
            <div class="cart-item">
                ${item.image ? `<img src="${item.image}" alt="${item.name}" class="cart-item-image">` : `<div class="cart-item-icon"><i class="fas ${item.icon}"></i></div>`}
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="cart-item-price">${formatCurrency(item.price)}</div>
                    <div class="cart-item-customization">
                        ${item.sugarLevel ? `<span class="customization-tag sugar-tag"><i class="fas fa-candy-cane"></i> ${sugarLabels[item.sugarLevel]}</span>` : ''}
                        ${item.iceLevel ? `<span class="customization-tag ice-tag"><i class="fas fa-snowflake"></i> ${iceLabels[item.iceLevel]}</span>` : ''}
                    </div>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="pos.decreaseQty(${i})">-</button>
                    <span class="cart-item-qty">${item.quantity}</span>
                    <button class="qty-btn" onclick="pos.increaseQty(${i})">+</button>
                    <button class="cart-item-remove" onclick="pos.removeFromCart(${i})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
        document.getElementById('checkoutBtn').disabled = false;
    }

    document.getElementById('cartCount').textContent = `(${this.cart.reduce((s, i) => s + i.quantity, 0)})`;
    
    // Always update totals and show exchange rate, even when cart is empty
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
    
    // Show/hide exchange rate display
    const exchangeRateDisplay = document.getElementById('exchangeRateDisplay');
    const cartExchangeRate = document.getElementById('cartExchangeRate');
    if (exchangeRateDisplay && cartExchangeRate) {
        if (showDualCurrency) {
            exchangeRateDisplay.classList.add('show');
            cartExchangeRate.textContent = getExchangeRate().toLocaleString();
        } else {
            exchangeRateDisplay.classList.remove('show');
        }
    }
    
    document.getElementById('subtotal').textContent       = formatCurrency(subtotal);
    document.getElementById('discountAmount').textContent = '-' + formatCurrency(discountAmount);
    document.getElementById('total').textContent          = formatCurrency(total);
};

CoffeePOS.prototype.openCheckout = function () {
    const { subtotal, discountPercent, discountAmount, total } = this._calcDiscount();
    const exchangeRate = getExchangeRate();

    // Show/hide exchange rate info
    const checkoutExchangeRateInfo = document.getElementById('checkoutExchangeRateInfo');
    const usdPaymentGroup = document.getElementById('usdPaymentGroup');
    const changeAmountUSD = document.getElementById('changeAmountUSD');
    const usdAmounts = document.querySelectorAll('.usd-amount');

    if (showDualCurrency) {
        checkoutExchangeRateInfo.classList.add('show');
        usdPaymentGroup.classList.add('show');
        changeAmountUSD.classList.add('show');
        document.getElementById('checkoutExchangeRate').textContent = exchangeRate;
        usdAmounts.forEach(el => el.classList.add('show'));
    } else {
        checkoutExchangeRateInfo.classList.remove('show');
        usdPaymentGroup.classList.remove('show');
        changeAmountUSD.classList.remove('show');
        usdAmounts.forEach(el => el.classList.remove('show'));
    }

    document.getElementById('receiptNumber').textContent  = generateReceiptNumber();
    document.getElementById('receiptDate').textContent    = formatDate(new Date().toISOString());
    document.getElementById('receiptServer').textContent  = this.currentUser.fullname;
    
    const sugarLabels = {
        'normal': 'ផ្អែមធម្មតា',
        'less': 'ផ្អែមតិច',
        'none': 'មិនផ្អែម'
    };
    const iceLabels = {
        'normal': 'ទឹកកកធម្តា',
        'less': 'ទឹកកកតិច',
        'none': 'មិនដាក់ទឹកកក'
    };
    
    document.getElementById('receiptItems').innerHTML     = this.cart.map(item => {
        let customizations = '';
        if (item.sugarLevel || item.iceLevel) {
            const customTags = [];
            if (item.sugarLevel) customTags.push(sugarLabels[item.sugarLevel]);
            if (item.iceLevel) customTags.push(iceLabels[item.iceLevel]);
            customizations = `<div class="receipt-item-custom">${customTags.join(' | ')}</div>`;
        }
        return `
        <div class="receipt-item">
            <span class="receipt-item-name">${item.name}</span>
            <span class="receipt-item-qty">x${item.quantity}</span>
            <span class="receipt-item-price">${formatCurrency(item.price * item.quantity)}</span>
            ${customizations}
        </div>`;
    }).join('');

    document.getElementById('receiptSubtotal').textContent        = formatCurrency(subtotal);
    document.getElementById('receiptSubtotalUSD').textContent     = `($${(subtotal / exchangeRate).toFixed(2)})`;
    document.getElementById('receiptDiscountPercent').textContent = discountPercent > 0 ? discountPercent + '%' : '0%';
    document.getElementById('receiptDiscountAmount').textContent  = formatCurrency(discountAmount);
    document.getElementById('receiptDiscountAmountUSD').textContent = `($${(discountAmount / exchangeRate).toFixed(2)})`;
    document.getElementById('receiptTotal').textContent           = formatCurrency(total);
    document.getElementById('receiptTotalUSD').textContent        = `($${(total / exchangeRate).toFixed(2)})`;
    document.getElementById('amountReceived').value               = '';
    document.getElementById('amountReceivedUSD').value            = '';
    document.getElementById('changeAmount').textContent           = '0៛';
    document.getElementById('changeAmountUSD').textContent        = '($0.00)';
    if (showDualCurrency) {
        document.getElementById('changeAmountUSD').classList.add('show');
    }

    document.getElementById('checkoutModal').classList.add('active');
};

CoffeePOS.prototype.calculateChange = function () {
    const { total } = this._calcDiscount();
    const exchangeRate = getExchangeRate();
    const receivedKHR  = parseFloat(document.getElementById('amountReceived').value) || 0;
    const receivedUSD  = parseFloat(document.getElementById('amountReceivedUSD').value) || 0;
    
    // Calculate total received (convert USD to KHR if provided)
    const totalReceived = receivedKHR + (receivedUSD * exchangeRate);
    const change = totalReceived - total;
    
    document.getElementById('changeAmount').textContent = change >= 0 ? formatCurrency(change) : '0៛';
    
    if (showDualCurrency) {
        const changeUSD = change / exchangeRate;
        document.getElementById('changeAmountUSD').textContent = change >= 0 ? `($${changeUSD.toFixed(2)})` : '($0.00)';
        document.getElementById('changeAmountUSD').classList.add('show');
    } else {
        document.getElementById('changeAmountUSD').classList.remove('show');
    }
};

CoffeePOS.prototype.confirmPayment = async function () {
    const { subtotal, discountPercent, discountAmount, total } = this._calcDiscount();
    const exchangeRate = getExchangeRate();
    const receivedKHR = parseFloat(document.getElementById('amountReceived').value) || 0;
    const receivedUSD = parseFloat(document.getElementById('amountReceivedUSD').value) || 0;
    
    // Calculate total received (convert USD to KHR if provided)
    const totalReceivedKHR = receivedKHR + (receivedUSD * exchangeRate);
    const totalReceivedUSD = receivedUSD + (receivedKHR / exchangeRate);

    if (totalReceivedKHR < total && total > 0) {
        this.showToast('ចំនួនទទួលមិនគ្រប់គ្រាន់!', 'error');
        return;
    }

    const changeKHR = totalReceivedKHR - total;
    const changeUSD = changeKHR / exchangeRate;

    const order = {
        receiptNumber: document.getElementById('receiptNumber').textContent,
        date:          new Date().toISOString(),
        items:         [...this.cart],
        subtotal,
        discountPercent,
        discountAmount,
        total,
        totalUSD: total / exchangeRate,
        paymentMethod: document.querySelector('.payment-method.active').dataset.method,
        amountReceived: totalReceivedKHR,
        amountReceivedUSD: totalReceivedUSD,
        changeAmount: changeKHR,
        changeAmountUSD: changeUSD,
        exchangeRate: exchangeRate,
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

CoffeePOS.prototype.saveExchangeRate = async function () {
    const exchangeRateInput = document.getElementById('exchangeRateInput');
    const exchangeRate = parseFloat(exchangeRateInput.value);
    
    if (!exchangeRate || exchangeRate < 1000 || exchangeRate > 10000) {
        this.showToast('អត្រាប្តូរប្រាក់ត្រូវតែនៅចន្លោះ 1,000 - 10,000', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                settings: {
                    exchangeRate: exchangeRate
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update global exchange rate
            setExchangeRate(exchangeRate);
            enableDualCurrency();
            
            // Update display
            const currentExchangeRate = document.getElementById('currentExchangeRate');
            if (currentExchangeRate) {
                currentExchangeRate.textContent = exchangeRate;
            }
            
            this.showToast(`អត្រាបតូរបរាក់តរូវបានរក្ាទុក! 1 USD = ${exchangeRate} KHR`, 'success');

            this.renderProducts();
            this.renderCart();
        } else {
            this.showToast('មិនអាចរក្សាទុកអត្រាបតូរប្រាក់បានទេ', 'error');
        }
    } catch (error) {
        console.error('Save exchange rate error:', error);
        this.showToast('កំហុសក្នុងការរក្សាទុកអត្រាបតូរប្រាក់', 'error');
    }
};
