// Reports: generate report stats + top products chart

// Debounce timer for report generation
let reportDebounceTimer = null;

CoffeePOS.prototype.generateReports = async function () {
    // Clear previous pending request
    if (reportDebounceTimer) {
        clearTimeout(reportDebounceTimer);
    }

    // Debounce: wait 300ms before making API call
    reportDebounceTimer = setTimeout(async () => {
        // Get dates from quick filter or custom range
        const quickFilter = document.getElementById('reportDateQuickFilter');
        const period = quickFilter ? quickFilter.value : 'today';
        
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
            case 'week': {
                const dayOfWeek = now.getDay() || 7;
                startDate.setDate(now.getDate() - dayOfWeek + 1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                periodLabel = 'សប្ដាហ៍នេះ';
                break;
            }
            case 'month':
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                periodLabel = 'ខែនេះ';
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

            // Check for rate limit error
            if (summaryRes.status === 429 || ordersRes.status === 429) {
                this.showToast('សូមរង់ចាំបន្តិច រួចសាកម្ដងទៀត', 'warning');
                return;
            }

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
    }, 300); // Wait 300ms before making the API call
};

// Initialize quick date filter for reports
CoffeePOS.prototype.initReportDateFilter = function () {
    // Prevent multiple initializations
    if (this._reportDateFilterInitialized) return;
    this._reportDateFilterInitialized = true;

    const quickFilter = document.getElementById('reportDateQuickFilter');
    const startDateInput = document.getElementById('customStartDate');
    const endDateInput = document.getElementById('customEndDate');
    const separator = document.querySelector('#customDateRange .to-separator');

    if (!quickFilter || !startDateInput || !endDateInput) return;

    quickFilter.addEventListener('change', (e) => {
        const value = e.target.value;

        if (value === 'custom') {
            // Show custom date inputs
            startDateInput.style.display = 'inline-block';
            endDateInput.style.display = 'inline-block';
            if (separator) separator.style.display = 'inline';
            startDateInput.focus();
        } else {
            // Hide custom date inputs
            startDateInput.style.display = 'none';
            endDateInput.style.display = 'none';
            if (separator) separator.style.display = 'none';
            
            // Auto-generate report
            this.generateReports();
        }
    });

    // Set default to "today" on page load
    quickFilter.value = 'today';
    quickFilter.dispatchEvent(new Event('change'));
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
        if (!container) return;

        container.innerHTML = topProducts.map(([name, qty], index) => `
            <div class="top-product-item">
                <div class="top-product-rank">${index + 1}</div>
                <div class="top-product-info">
                    <div class="top-product-name">${name}</div>
                </div>
                <div class="top-product-qty">${qty}</div>
            </div>
        `).join('') || '<div class="no-data">គ្មានទិន្នន័យ</div>';

        await this.renderSalesChart(startDate, endDate);
    } catch (error) {
        console.error('Load top products error:', error);
    }
};

CoffeePOS.prototype.renderSalesChart = async function (startDate, endDate) {
    try {
        const result = await fetch(`/api/reports/sales-by-date?startDate=${startDate}&endDate=${endDate}`).then(r => r.json());
        if (!result.success || !result.data) return;

        const chartContainer = document.getElementById('salesChartContainer');
        if (!chartContainer) return;

        const data = result.data;
        const maxValue = Math.max(...data.map(d => d.totalSales), 1);

        chartContainer.innerHTML = data.map(item => {
            const barWidth = (item.totalSales / maxValue) * 100;
            return `
                <div class="chart-bar-item">
                    <div class="chart-bar-label">${item.date}</div>
                    <div class="chart-bar-container">
                        <div class="chart-bar" style="width: ${barWidth}%"></div>
                    </div>
                    <div class="chart-bar-value">${formatCurrency(item.totalSales)}</div>
                </div>
            `;
        }).join('') || '<div class="no-data">គ្មានទិន្ននយ</div>';
    } catch (error) {
        console.error('Render sales chart error:', error);
    }
};
