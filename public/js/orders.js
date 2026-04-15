// Orders: list, view, print, export

CoffeePOS.prototype.renderOrders = async function () {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;">កំពុងទាញយកទិន្នន័យ...</td></tr>';

    try {
        let url = '/api/orders?';
        if (this.currentUser.role === 'staff') url += `userId=${this.currentUser.id}&`;

        // Seller filter
        const sellerId = document.getElementById('orderSellerFilter')?.value;
        if (sellerId) url += `userId=${sellerId}&`;

        // Date range filter
        const startDate = document.getElementById('orderStartDate').value;
        const endDate = document.getElementById('orderEndDate').value;
        if (startDate) url += `startDate=${startDate}&`;
        if (endDate) url += `endDate=${endDate}&`;

        const result = await fetch(url).then(r => r.json());

        if (!result.success) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-light);">មិនអាចទាញយកទិន្នន័យបានទេ!</td></tr>';
            this.showToast('មិនអាចទាញយកការលក់បានទេ!', 'error');
            return;
        }

        const { orders = [] } = result;
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
                    <td data-label="ល.រ">${index + 1}</td>
                    <td data-label="លេខវិក័យបត្រ">${order.receiptNumber}</td>
                    <td data-label="កាលបរិច្ឆេទ">${formatDate(order.date)}</td>
                    <td data-label="មុខម្ហូប" class="order-items-cell">${itemNames}</td>
                    <td data-label="ចំនួន">${itemCount}</td>
                    <td data-label="សរុប">${formatCurrency(order.total)}</td>
                    <td data-label="បញ្ចុះ">${order.discountAmount > 0 ? formatCurrency(order.discountAmount) : '-'}</td>
                    <td data-label="អ្នកលក់">${order.userName}</td>
                    <td data-label="សកម្មភាព"><button class="btn-view-order" onclick="pos.viewOrder('${order.id}')"><i class="fas fa-eye"></i></button></td>
                </tr>`;
        }).join('');
    } catch (error) {
        console.error('Render orders error:', error);
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-light);">កំហុសក្នុងការទាញយកទិន្នន័យ!</td></tr>';
        this.showToast('កំហុស: ' + error.message, 'error');
    }
};

// Quick date filter handler
CoffeePOS.prototype.initQuickDateFilter = function () {
    // Prevent multiple initializations
    if (this._quickDateFilterInitialized) return;
    this._quickDateFilterInitialized = true;

    const quickFilter = document.getElementById('orderDateQuickFilter');
    const startDateInput = document.getElementById('orderStartDate');
    const endDateInput = document.getElementById('orderEndDate');
    const separator = document.querySelector('.to-separator');

    if (!quickFilter || !startDateInput || !endDateInput) return;

    const today = new Date();

    quickFilter.addEventListener('change', (e) => {
        const value = e.target.value;
        let start = null;
        let end = null;

        switch (value) {
            case 'today':
                // Today
                start = end = today.toISOString().split('T')[0];
                break;

            case 'week':
                // This week (Monday to today)
                const dayOfWeek = today.getDay() || 7; // 1=Monday, 7=Sunday
                const monday = new Date(today);
                monday.setDate(today.getDate() - dayOfWeek + 1);
                start = monday.toISOString().split('T')[0];
                end = today.toISOString().split('T')[0];
                break;

            case 'month':
                // This month (1st to today)
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                start = firstDay.toISOString().split('T')[0];
                end = today.toISOString().split('T')[0];
                break;

            case 'custom':
                // Custom - show date inputs, clear values
                startDateInput.style.display = 'inline-block';
                endDateInput.style.display = 'inline-block';
                if (separator) separator.style.display = 'inline';
                startDateInput.value = '';
                endDateInput.value = '';
                startDateInput.focus();
                return;
        }

        // Hide custom date inputs for preset ranges
        startDateInput.style.display = 'none';
        endDateInput.style.display = 'none';
        if (separator) separator.style.display = 'none';

        // Set values and refresh
        startDateInput.value = start;
        endDateInput.value = end;
        this.renderOrders();
    });

    // Set default to "today" on page load
    quickFilter.value = 'today';
    quickFilter.dispatchEvent(new Event('change'));
};

// Populate seller dropdown with users
CoffeePOS.prototype.populateSellerFilter = async function () {
    const select = document.getElementById('orderSellerFilter');
    if (!select) return;

    try {
        const result = await fetch(
            `/api/users?userId=${this.currentUser.id}&userRole=${this.currentUser.role}`
        ).then(r => r.json());

        if (result.success && result.users) {
            // Keep the "All sellers" option
            select.innerHTML = '<option value="">អ្នកលក់ទាំងអស់</option>';

            result.users.forEach(user => {
                const opt = document.createElement('option');
                opt.value = user.id;
                opt.textContent = user.fullname;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Error populating seller filter:', error);
    }
};

// Initialize export dropdown toggle
CoffeePOS.prototype.initExportDropdown = function () {
    const exportBtn = document.getElementById('exportOrdersBtn');
    const exportMenu = document.getElementById('exportMenu');

    if (exportBtn && exportMenu) {
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportMenu.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            exportMenu.classList.remove('show');
        });
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
            <div class="order-info-item"><label>អ្នកលក់</label><span>${order.userName}</span></div>
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
        <div style="text-align:center;margin-bottom:15px;"><h3>Coffee POS</h3><p>ប្រព័ន្ធគរប់គ្រងហាងកាហ្វេ</p></div>
        <div style="border-top:2px dashed #ddd;margin:15px 0;"></div>
        <p><strong>លេខវិក័យបត្រ:</strong> ${order.receiptNumber}</p>
        <p><strong>កាលបរិច្ឆេទ:</strong> ${formatDate(order.date)}</p>
        <p><strong>អ្នកលក់:</strong> ${order.userName}</p>
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

// Helper function to fetch current logo from settings
CoffeePOS.prototype.getCurrentLogo = async function () {
    try {
        const response = await fetch('/api/settings');
        if (!response.ok) return null;

        const data = await response.json();
        if (data.success && data.settings && data.settings.systemLogo) {
            return data.settings.systemLogo; // base64 string
        }
    } catch (error) {
        console.error('Error fetching logo:', error);
    }
    return null;
};

// Helper function to fetch currency symbol from settings
CoffeePOS.prototype.getCurrencySymbol = async function () {
    try {
        const response = await fetch('/api/settings');
        if (!response.ok) return '៛';

        const data = await response.json();
        if (data.success && data.settings && data.settings.currency) {
            return data.settings.currency;
        }
    } catch (error) {
        console.error('Error fetching currency:', error);
    }
    return '៛'; // Default to Khmer Riel
};

// Helper function to format amount with currency
function formatExportAmount(amount, currencySymbol) {
    return amount.toLocaleString('km-KH') + currencySymbol;
}

// Helper function to get formatted date range string for exports
CoffeePOS.prototype.getExportDateRange = function () {
    const startDate = document.getElementById('orderStartDate').value;
    const endDate = document.getElementById('orderEndDate').value;

    if (!startDate && !endDate) return { startDate: '...', endDate: '...' };

    return {
        startDate: startDate || '...',
        endDate: endDate || '...'
    };
};

// Export to Word (DOCX)
CoffeePOS.prototype.exportOrdersWord = async function () {
    const { orders } = this.data;
    if (orders.length === 0) {
        this.showToast('គ្មានទិន្ននយសម្រាប់ Export', 'warning');
        return;
    }

    try {
        this.showToast('កំពុងរៀបចំឯកសារ Word...', 'info');

        const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun, HeadingLevel, BorderStyle, ShadingType, ImageRun } = docx;

        // Fetch current logo and currency
        const logoBase64 = await this.getCurrentLogo();
        const currency = await this.getCurrencySymbol();
        let logoBuffer = null;

        if (logoBase64) {
            // Convert base64 to ArrayBuffer for docx ImageRun
            const base64Data = logoBase64.replace(/^data:image\/[a-z]+;base64,/, '');
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            logoBuffer = bytes.buffer;
        }

        // Get filter info
        const { startDate, endDate } = this.getExportDateRange();
        const sellerFilter = document.getElementById('orderSellerFilter');
        const sellerName = sellerFilter.options[sellerFilter.selectedIndex].text;

        // Create document header
        const children = [];

        // Add logo if available
        if (logoBuffer) {
            children.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new ImageRun({
                            data: logoBuffer,
                            transformation: {
                                width: 100,
                                height: 80
                            }
                        })
                    ],
                    spacing: { after: 200 }
                })
            );
        }

        children.push(
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({
                        text: 'ប្រវតតិការលក់',
                        bold: true,
                        size: 48,
                        font: 'Khmer OS Battambang'
                    })
                ]
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({
                        text: 'Order History Report',
                        size: 28,
                        color: '666666'
                    })
                ],
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: 'កាលបរិច្ឆេទ: ', bold: true }),
                    new TextRun({ text: `${startDate || '...'} ដល់ ${endDate || '...'}` })
                ]
            }),
        );

        if (sellerName !== 'អ្នកលក់ទាំងអស់') {
            children.push(new Paragraph({
                children: [
                    new TextRun({ text: 'អ្នកលក់: ', bold: true }),
                    new TextRun({ text: sellerName })
                ]
            }));
        }

        children.push(new Paragraph({
            children: [
                new TextRun({ text: 'បោះពុម្ព: ', bold: true }),
                new TextRun({ text: new Date().toLocaleString('km-KH') })
            ],
            spacing: { after: 300 }
        }));

        // Create table header row
        const headerCells = [
            new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'ល.រ', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
                shading: { type: ShadingType.SOLID, color: '6F4E37' },
                width: { size: 40, type: WidthType.DXA }
            }),
            new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'លេខវិក័យបត្រ', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
                shading: { type: ShadingType.SOLID, color: '6F4E37' }
            }),
            new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'កាលបរិច្ឆេទ', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
                shading: { type: ShadingType.SOLID, color: '6F4E37' }
            }),
            new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'មុខម្ហូប', bold: true, color: 'FFFFFF' })] })],
                shading: { type: ShadingType.SOLID, color: '6F4E37' }
            }),
            new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'ចំនួន', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
                shading: { type: ShadingType.SOLID, color: '6F4E37' },
                width: { size: 60, type: WidthType.DXA }
            }),
            new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'សរុប', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.RIGHT })],
                shading: { type: ShadingType.SOLID, color: '6F4E37' },
                width: { size: 90, type: WidthType.DXA }
            }),
            new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'បញ្ចុះ', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.RIGHT })],
                shading: { type: ShadingType.SOLID, color: '6F4E37' },
                width: { size: 80, type: WidthType.DXA }
            }),
            new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'អ្នកលក់', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
                shading: { type: ShadingType.SOLID, color: '6F4E37' }
            })
        ];

        // Create table rows
        const tableRows = [new TableRow({ children: headerCells })];

        let totalRevenue = 0;
        let totalDiscount = 0;

        orders.forEach((order, index) => {
            const items = parseOrderItems(order.items);
            const itemCount = items.reduce((s, i) => s + i.quantity, 0);
            const itemNames = items.map(i => i.name).join(', ');

            totalRevenue += order.total;
            totalDiscount += order.discountAmount || 0;

            const rowCells = [
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: String(index + 1) })], alignment: AlignmentType.CENTER })],
                    shading: { type: index % 2 === 0 ? ShadingType.CLEAR : ShadingType.SOLID, color: index % 2 === 0 ? 'FFFFFF' : 'F9F9F9' }
                }),
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: order.receiptNumber })], alignment: AlignmentType.CENTER })],
                    shading: { type: index % 2 === 0 ? ShadingType.CLEAR : ShadingType.SOLID, color: index % 2 === 0 ? 'FFFFFF' : 'F9F9F9' }
                }),
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: order.date })], alignment: AlignmentType.CENTER })],
                    shading: { type: index % 2 === 0 ? ShadingType.CLEAR : ShadingType.SOLID, color: index % 2 === 0 ? 'FFFFFF' : 'F9F9F9' }
                }),
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: itemNames })] })],
                    shading: { type: index % 2 === 0 ? ShadingType.CLEAR : ShadingType.SOLID, color: index % 2 === 0 ? 'FFFFFF' : 'F9F9F9' }
                }),
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: String(itemCount) })], alignment: AlignmentType.CENTER })],
                    shading: { type: index % 2 === 0 ? ShadingType.CLEAR : ShadingType.SOLID, color: index % 2 === 0 ? 'FFFFFF' : 'F9F9F9' }
                }),
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: formatExportAmount(order.total, currency) })], alignment: AlignmentType.RIGHT })],
                    shading: { type: index % 2 === 0 ? ShadingType.CLEAR : ShadingType.SOLID, color: index % 2 === 0 ? 'FFFFFF' : 'F9F9F9' }
                }),
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: order.discountAmount > 0 ? formatExportAmount(order.discountAmount, currency) : '-' })], alignment: AlignmentType.RIGHT })],
                    shading: { type: index % 2 === 0 ? ShadingType.CLEAR : ShadingType.SOLID, color: index % 2 === 0 ? 'FFFFFF' : 'F9F9F9' }
                }),
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: order.userName })], alignment: AlignmentType.CENTER })],
                    shading: { type: index % 2 === 0 ? ShadingType.CLEAR : ShadingType.SOLID, color: index % 2 === 0 ? 'FFFFFF' : 'F9F9F9' }
                })
            ];

            tableRows.push(new TableRow({ children: rowCells }));
        });

        // Create table
        const table = new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
        });

        children.push(table);

        // Add summary section
        children.push(
            new Paragraph({ spacing: { before: 300, after: 100 } }),
            new Paragraph({
                children: [
                    new TextRun({ text: 'សរុបការលក់: ', bold: true }),
                    new TextRun({ text: `${orders.length} វិក័យបត្រ` })
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: 'ចំនួនទឹកប្រាក់សរុប: ', bold: true }),
                    new TextRun({ text: formatExportAmount(totalRevenue, currency) })
                ]
            })
        );

        if (totalDiscount > 0) {
            children.push(new Paragraph({
                children: [
                    new TextRun({ text: 'បញ្ចុះសរុប: ', bold: true }),
                    new TextRun({ text: formatExportAmount(totalDiscount, currency) })
                ]
            }));
        }

        // Create document
        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 }
                    }
                },
                children: children
            }]
        });

        // Generate and download
        const blob = await Packer.toBlob(doc);
        const filename = `orders_${new Date().toISOString().split('T')[0]}.docx`;
        saveAs(blob, filename);
        this.showToast('បាន Export ទិន្ននយ Word ជោគជ័យ!', 'success');
    } catch (error) {
        console.error('Word Export error:', error);
        this.showToast('កំហុសក្នុងការ Export Word: ' + error.message, 'error');
    }
};

// Export to Excel (XLSX)
CoffeePOS.prototype.exportOrdersExcel = async function () {
    const { orders } = this.data;
    if (orders.length === 0) {
        this.showToast('គ្មានទិន្ននយសម្រាប់ Export', 'warning');
        return;
    }

    // Fetch current logo name and currency
    let logoName = 'Coffee POS';
    let currency = '៛';
    try {
        const response = await fetch('/api/settings');
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.settings) {
                if (data.settings.systemLogoName) {
                    logoName = data.settings.systemLogoName.replace(/\.[^/.]+$/, ''); // Remove file extension
                }
                if (data.settings.currency) {
                    currency = data.settings.currency;
                }
            }
        }
    } catch (error) {
        console.error('Error fetching settings:', error);
    }

    // Prepare data for Excel with header rows
    const data = [];

    // Add title row with logo name
    data.push({
        'ល.រ': `${logoName} - Order History Report`,
        'លេខវិក័យបត្រ': '',
        'កាលបរិច្ឆេទ': '',
        'មុខម្ហូប': '',
        'ចំនួន': '',
        'សរុប': '',
        'បញ្ចុះ': '',
        'អ្នកលក់': ''
    });

    // Add filter info row
    const { startDate, endDate } = this.getExportDateRange();
    const sellerFilter = document.getElementById('orderSellerFilter');
    const sellerName = sellerFilter.options[sellerFilter.selectedIndex].text;

    let filterText = `កាលបរិច្ឆេទ: ${startDate || '...'} ដល់ ${endDate || '...'}`;
    if (sellerName !== 'អ្នកលក់ទាំងអស់') {
        filterText += ` | អ្នកលក់: ${sellerName}`;
    }
    filterText += ` | បោះពុម្ព: ${new Date().toLocaleString('km-KH')}`;

    data.push({
        'ល.រ': filterText,
        'លេខវិក័យបត្រ': '',
        'កាលបរិច្ឆេទ': '',
        'មុខម្ហូប': '',
        'ចំនួន': '',
        'សរុប': '',
        'បញ្ចុះ': '',
        'អ្នកលក់': ''
    });

    // Add empty row
    data.push({
        'ល.រ': '',
        'លេខវិក័យបត្រ': '',
        'កាលបរិច្ឆេទ': '',
        'មុខម្ហូប': '',
        'ចំនួន': '',
        'សរុប': '',
        'បញ្ចុះ': '',
        'អ្នកលក់': ''
    });

    // Add actual order data
    orders.forEach((order, index) => {
        const items = parseOrderItems(order.items);
        const itemCount = items.reduce((s, i) => s + i.quantity, 0);
        const itemNames = items.map(i => i.name).join('; ');

        data.push({
            'ល.រ': index + 1,
            'លេខវិក័យបត្រ': order.receiptNumber,
            'កាលបរិច្ឆេទ': order.date,
            'មុខម្ហូប': itemNames,
            'ចំនួន': itemCount,
            'សរុប': order.total.toLocaleString('km-KH') + currency,
            'បញ្ចុះ': order.discountAmount > 0 ? order.discountAmount.toLocaleString('km-KH') + currency : '-',
            'អ្នកលក់': order.userName
        });
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data, { skipHeader: true });

    // Set column widths
    ws['!cols'] = [
        { wch: 5 },  // ល.រ
        { wch: 20 }, // លេខវិក័យបត្រ
        { wch: 20 }, // កាលបរិច្ឆេទ
        { wch: 40 }, // មុខម្ហូប
        { wch: 10 }, // ចំនួន
        { wch: 12 }, // សរុប
        { wch: 12 }, // បញ្ចុះ
        { wch: 15 }  // អ្នកលក់
    ];

    // Merge cells for title row
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },  // Title row
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }   // Filter info row
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'ប្រវត្តិការលក់');

    // Generate filename with date range
    const dateRange = startDate && endDate ? `_${startDate}_to_${endDate}` : '';
    const filename = `orders${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
    this.showToast('បាន Export ទិន្ននយ Excel!', 'success');
};

// Export to PDF using html2canvas for proper Khmer text support
CoffeePOS.prototype.exportOrdersPDF = async function () {
    const { orders } = this.data;
    if (orders.length === 0) {
        this.showToast('គ្មានទិន្ននយសម្រាប់ Export', 'warning');
        return;
    }

    try {
        this.showToast('កំពុងរៀបចំឯកសារ PDF...', 'info');

        // Fetch current logo and currency
        const logoBase64 = await this.getCurrentLogo();
        const currency = await this.getCurrencySymbol();

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation

        // Create a temporary container for the table
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '1100px';
        tempDiv.style.background = 'white';
        tempDiv.style.padding = '20px';
        tempDiv.style.fontFamily = "'Kantumruy Pro', sans-serif";

        // Build HTML with logo and table
        let tableHTML = `
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px; gap: 20px;">
        `;

        // Add logo if available
        if (logoBase64) {
            tableHTML += `<img src="${logoBase64}" style="width: 80px; height: 64px; object-fit: contain;" />`;
        }

        tableHTML += `
                <div style="text-align: center;">
                    <h2 style="margin: 0; color: #6f4e37; font-size: 24px;">ប្រវត្តិការលក់</h2>
                    <p style="margin: 5px 0; color: #666; font-size: 14px;">Order History Report</p>
                </div>
            </div>
            <div style="margin-bottom: 15px; font-size: 12px; color: #555;">
        `;

        // Add filter info
        const { startDate, endDate } = this.getExportDateRange();
        const sellerFilter = document.getElementById('orderSellerFilter');
        const sellerName = sellerFilter.options[sellerFilter.selectedIndex].text;

        if (startDate || endDate) {
            tableHTML += `<p style="margin: 3px 0;">កាលបរិច្ឆេទ: ${startDate || '...'} ដល់ ${endDate || '...'}</p>`;
        }
        if (sellerName !== 'អ្នកលក់ទាំងអស់') {
            tableHTML += `<p style="margin: 3px 0;">អ្នកលក់: ${sellerName}</p>`;
        }
        tableHTML += `<p style="margin: 3px 0;">បោះពុម្ព: ${new Date().toLocaleString('km-KH')}</p>`;
        tableHTML += `</div>`;

        // Build table
        tableHTML += `
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                    <tr style="background-color: #6f4e37; color: white;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 40px;">ល.រ</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">លេខវិក័យបត្រ</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">កាលបរិច្ឆេទ</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">មុខម្ហូប</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 60px;">ចំនួន</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: right; width: 90px;">សរុប</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: right; width: 80px;">បញ្ចុះ</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">អ្នកលក់</th>
                    </tr>
                </thead>
                <tbody>
        `;

        orders.forEach((order, index) => {
            const items = parseOrderItems(order.items);
            const itemCount = items.reduce((s, i) => s + i.quantity, 0);
            const itemNames = items.map(i => i.name).join(', ');
            const bgColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';

            tableHTML += `
                <tr style="background-color: ${bgColor};">
                    <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
                    <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${order.receiptNumber}</td>
                    <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${order.date}</td>
                    <td style="padding: 6px 8px; border: 1px solid #ddd;">${itemNames}</td>
                    <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${itemCount}</td>
                    <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${formatExportAmount(order.total, currency)}</td>
                    <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${order.discountAmount > 0 ? formatExportAmount(order.discountAmount, currency) : '-'}</td>
                    <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${order.userName}</td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table>`;

        // Add summary
        const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
        const totalDiscount = orders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);

        tableHTML += `
            <div style="margin-top: 15px; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
                <p style="margin: 5px 0; font-size: 12px;"><strong>សរុបការលក់:</strong> ${orders.length} វិក័យបត្រ</p>
                <p style="margin: 5px 0; font-size: 12px;"><strong>ចំនួនទឹកប្រាក់សរុប:</strong> ${formatExportAmount(totalRevenue, currency)}</p>
                ${totalDiscount > 0 ? `<p style="margin: 5px 0; font-size: 12px;"><strong>បញ្ចុះសរុប:</strong> ${formatExportAmount(totalDiscount, currency)}</p>` : ''}
            </div>
        `;

        tempDiv.innerHTML = tableHTML;
        document.body.appendChild(tempDiv);

        // Wait a bit for fonts and image to load
        await new Promise(resolve => setTimeout(resolve, 500));

        // Capture the table as an image
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        // Remove temporary div
        document.body.removeChild(tempDiv);

        // Add the captured image to PDF
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 280;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        doc.addImage(imgData, 'PNG', 14, 10, imgWidth, imgHeight);

        // Download
        const filename = `orders_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        this.showToast('បាន Export ទិន្ននយ PDF ជោគជ័យ!', 'success');
    } catch (error) {
        console.error('PDF Export error:', error);
        this.showToast('កំហុសក្នុងការ Export PDF: ' + error.message, 'error');
    }
};
