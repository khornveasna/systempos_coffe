// Orders: list, view, print, export

CoffeePOS.prototype.renderOrders = async function () {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;">កំពុងទាញយកទិន្នន័យ...</td></tr>';

    try {
        let url = '/api/orders?';
        if (this.currentUser.role === 'staff') url += `userId=${this.currentUser.id}&`;
        const dateFilter = document.getElementById('orderDateFilter').value;
        if (dateFilter) url += `date=${dateFilter}&`;

        const result = await fetch(url).then(r => r.json());

        if (!result.success) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-light);">មិនអាចទាញយកទិន្នន័យបានទេ!</td></tr>';
            this.showToast('មិនអាចទាញយកការលក់បានទេ!', 'error');
            return;
        }

        const orders = result.orders;
        this.data.orders = orders;

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-light);">គ្មានការលក់</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map((order, index) => {
            const items     = parseOrderItems(order.items);
            const itemCount = items.reduce((s, i) => s + i.quantity, 0);
            const itemNames = items.map(i => i.name).join(', ');
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${order.receiptNumber}</td>
                    <td>${formatDate(order.date)}</td>
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${itemNames}</td>
                    <td>${itemCount}</td>
                    <td>${formatCurrency(order.total)}</td>
                    <td>${order.discountAmount > 0 ? formatCurrency(order.discountAmount) : '-'}</td>
                    <td>${order.userName}</td>
                    <td><button class="btn-view-order" onclick="pos.viewOrder('${order.id}')"><i class="fas fa-eye"></i></button></td>
                </tr>`;
        }).join('');
    } catch (error) {
        console.error('Render orders error:', error);
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-light);">កំហុសក្នុងការទាញយកទិន្នន័យ!</td></tr>';
        this.showToast('កំហុស: ' + error.message, 'error');
    }
};

CoffeePOS.prototype.viewOrder = function (orderId) {
    const order = this.data.orders.find(o => o.id === orderId);
    if (!order) return;

    const items = parseOrderItems(order.items);
    this.viewingOrder = { ...order, items };

    document.getElementById('orderViewContent').innerHTML = `
        <div class="order-view-header">
            <div class="order-info-item"><label>លេខវិក័យបត្រ</label><span>${order.receiptNumber}</span></div>
            <div class="order-info-item"><label>កាលបរិច្ឆេទ</label><span>${formatDate(order.date)}</span></div>
            <div class="order-info-item"><label>អ្នកបម្រើ</label><span>${order.userName}</span></div>
            <div class="order-info-item"><label>វិធីទូទាត់</label><span>${order.paymentMethod.toUpperCase()}</span></div>
        </div>
        <div class="order-view-items">
            ${items.map(item => `
                <div class="order-view-item">
                    <span>${item.name} x${item.quantity}</span>
                    <span>${formatCurrency(item.price * item.quantity)}</span>
                </div>`).join('')}
        </div>
        <div class="order-view-totals">
            <div class="receipt-row"><span>ចំនួនទឹកប្រាក់:</span><span>${formatCurrency(order.subtotal)}</span></div>
            ${order.discountAmount > 0 ? `<div class="receipt-row discount"><span>បញ្ចុះ:</span><span>${formatCurrency(order.discountAmount)}</span></div>` : ''}
            <div class="receipt-row total"><span>សរុប:</span><span>${formatCurrency(order.total)}</span></div>
        </div>`;

    document.getElementById('orderViewModal').classList.add('active');
};

CoffeePOS.prototype.printOrder = function () {
    if (!this.viewingOrder) return;
    const order = this.viewingOrder;
    const win   = window.open('', '', 'width=400,height=600');
    win.document.write(`<!DOCTYPE html><html><head><title>Order Receipt</title><style>
        body{font-family:'Courier New',monospace;padding:20px;margin:0}
        .order-item,.total-row{display:flex;justify-content:space-between;margin-bottom:8px}
        .total-row.final{font-weight:bold;font-size:18px;border-top:2px solid #000;padding-top:10px}
    </style></head><body>
        <div style="text-align:center;margin-bottom:15px;"><h3>Coffee POS</h3><p>ប្រព័ន្ធគ្រប់គ្រងហាងកាហ្វេ</p></div>
        <div style="border-top:2px dashed #ddd;margin:15px 0;"></div>
        <p><strong>លេខវិក័យបត្រ:</strong> ${order.receiptNumber}</p>
        <p><strong>កាលបរិច្ឆេទ:</strong> ${formatDate(order.date)}</p>
        <p><strong>អ្នកបម្រើ:</strong> ${order.userName}</p>
        <div style="border-top:2px dashed #ddd;margin:15px 0;"></div>
        ${order.items.map(item => `<div class="order-item"><span>${item.name} x${item.quantity}</span><span>${formatCurrency(item.price * item.quantity)}</span></div>`).join('')}
        <div style="border-top:2px dashed #ddd;margin:15px 0;"></div>
        <div class="total-row"><span>ចំនួនទឹកប្រាក់:</span><span>${formatCurrency(order.subtotal)}</span></div>
        ${order.discountAmount > 0 ? `<div class="total-row" style="color:red;"><span>បញ្ចុះ:</span><span>${formatCurrency(order.discountAmount)}</span></div>` : ''}
        <div class="total-row final"><span>សរុប:</span><span>${formatCurrency(order.total)}</span></div>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 250);
};

CoffeePOS.prototype.exportOrders = function () {
    const orders = this.data.orders;
    if (orders.length === 0) {
        this.showToast('គ្មានទិន្នន័យសម្រាប់ Export', 'warning');
        return;
    }
    let csv = 'ល.រ,លេខវិក័យបត្រ,កាលបរិច្ឆេទ,មុខម្ហូប,ចំនួន,សរុប,បញ្ចុះ,អ្នកបម្រើ\n';
    orders.forEach((order, index) => {
        const items     = parseOrderItems(order.items);
        const itemCount = items.reduce((s, i) => s + i.quantity, 0);
        const itemNames = items.map(i => i.name).join('; ');
        csv += `${index + 1},${order.receiptNumber},${order.date},"${itemNames}",${itemCount},${order.total},${order.discountAmount},${order.userName}\n`;
    });
    const link  = document.createElement('a');
    link.href   = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    this.showToast('បាន Export ទិន្នន័យ!', 'success');
};
