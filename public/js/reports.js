// Reports: generate report stats + top products chart

CoffeePOS.prototype.generateReports = async function () {
    const period = document.getElementById('reportPeriod').value;
    const now    = new Date();
    let startDate   = new Date();
    let endDate     = new Date();
    let periodLabel = '';

    switch (period) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            periodLabel = 'ថ្ងៃនេះ';
            break;
        case 'yesterday':
            startDate.setDate(now.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setDate(now.getDate() - 1);
            endDate.setHours(23, 59, 59, 999);
            periodLabel = 'ម្សិលមិញ';
            break;
        case 'week': {
            const dayOfWeek = now.getDay() || 7;
            startDate.setDate(now.getDate() - dayOfWeek + 1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            periodLabel = 'សប្តាហ៍នេះ';
            break;
        }
        case 'lastWeek': {
            const lastWeekDay = now.getDay() || 7;
            startDate.setDate(now.getDate() - lastWeekDay - 6);
            startDate.setHours(0, 0, 0, 0);
            endDate.setDate(now.getDate() - lastWeekDay);
            endDate.setHours(23, 59, 59, 999);
            periodLabel = 'សប្តាហ៍មុន';
            break;
        }
        case 'month':
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            periodLabel = 'ខែនេះ';
            break;
        case 'lastMonth':
            startDate.setMonth(now.getMonth() - 1);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setMonth(now.getMonth() - 1);
            endDate.setDate(0);
            endDate.setHours(23, 59, 59, 999);
            periodLabel = 'ខែមុន';
            break;
        case 'year':
            startDate.setMonth(0, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            periodLabel = 'ឆ្នាំនេះ';
            break;
        case 'lastYear':
            startDate.setFullYear(now.getFullYear() - 1);
            startDate.setMonth(0, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setFullYear(now.getFullYear() - 1);
            endDate.setMonth(11, 31);
            endDate.setHours(23, 59, 59, 999);
            periodLabel = 'ឆ្នាំមុន';
            break;
        case 'custom': {
            const customStart = document.getElementById('customStartDate').value;
            const customEnd   = document.getElementById('customEndDate').value;
            if (customStart) { startDate = new Date(customStart); startDate.setHours(0, 0, 0, 0); }
            if (customEnd)   { endDate   = new Date(customEnd);   endDate.setHours(23, 59, 59, 999); }
            else             { endDate   = new Date();             endDate.setHours(23, 59, 59, 999); }
            periodLabel = 'កំណត់ដោយខ្លួនឯង';
            break;
        }
        default:
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            periodLabel = 'ថ្ងៃនេះ';
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr   = endDate.toISOString().split('T')[0];

    try {
        const [summaryRes, ordersRes] = await Promise.all([
            fetch(`/api/reports/summary?startDate=${startDateStr}&endDate=${endDateStr}`),
            fetch(`/api/orders?startDate=${startDateStr}&endDate=${endDateStr}`)
        ]);
        const summaryResult = await summaryRes.json();
        const ordersResult  = await ordersRes.json();

        if (!summaryResult.success) {
            this.showToast('មិនអាចទាញយករបាយការណ៍បានទេ!', 'error');
            return;
        }

        const stats = summaryResult.stats;

        document.getElementById('reportPeriodTitle').innerHTML =
            `<i class="fas fa-calendar-alt"></i><span>រយៈពេល: ${periodLabel}</span>`;
        document.getElementById('totalRevenue').textContent   = formatCurrency(stats.totalRevenue);
        document.getElementById('totalOrders').textContent    = stats.totalOrders;
        document.getElementById('topProduct').textContent     = stats.topProduct || '-';
        document.getElementById('avgOrderValue').textContent  = formatCurrency(stats.avgOrderValue);
        document.getElementById('reportTotalRevenue').textContent  = formatCurrency(stats.totalRevenue);
        document.getElementById('reportTotalDiscount').textContent = formatCurrency(stats.totalDiscount);
        document.getElementById('reportCustomers').textContent     = stats.totalOrders;

        let totalItemsSold = 0;
        if (ordersResult.success) {
            ordersResult.orders.forEach(order => {
                const items = parseOrderItems(order.items);
                if (Array.isArray(items)) {
                    totalItemsSold += items.reduce((sum, item) => sum + item.quantity, 0);
                }
            });
        }
        document.getElementById('reportItemsSold').textContent = totalItemsSold;

        await this.loadTopProducts(startDateStr, endDateStr);
    } catch (error) {
        console.error('Generate reports error:', error);
        this.showToast('កំហុសក្នុងការទាញយករបាយការណ៍: ' + error.message, 'error');
    }
};

CoffeePOS.prototype.loadTopProducts = async function (startDate, endDate) {
    try {
        const result = await fetch(`/api/orders?startDate=${startDate}&endDate=${endDate}`).then(r => r.json());
        if (!result.success) return;

        const productSales = {};
        result.orders.forEach(order => {
            const items = parseOrderItems(order.items);
            if (Array.isArray(items)) {
                items.forEach(item => {
                    productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
                });
            }
        });

        const topProducts = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const container = document.getElementById('topProductsList');
        if (topProducts.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:20px;">គ្មានទិន្នន័យ</p>';
            return;
        }
        container.innerHTML = topProducts.map(([name, qty], index) => `
            <div class="top-product-item">
                <div class="top-product-rank">#${index + 1}</div>
                <div class="top-product-info">
                    <div class="top-product-name">${name}</div>
                    <div class="top-product-qty">លក់បាន ${qty} ចំនួន</div>
                </div>
            </div>`).join('');
    } catch (error) {
        console.error('Load top products error:', error);
    }
};
