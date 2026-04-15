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
                this.showToast('សូមរង់ចាំបន្តិច រួចសាកម្ដងទត', 'warning');
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

        // Render top products list
        container.innerHTML = topProducts.map(([name, qty], index) => `
            <div class="top-product-item">
                <div class="top-product-rank">${index + 1}</div>
                <div class="top-product-info">
                    <div class="top-product-name">${name}</div>
                </div>
                <div class="top-product-qty">${qty}</div>
            </div>
        `).join('') || '<div class="no-data">គ្មានទិន្ននយ</div>';

        // Render pie chart
        await this.renderTopProductsPieChart(topProducts);
    } catch (error) {
        console.error('Load top products error:', error);
    }
};

CoffeePOS.prototype.renderTopProductsPieChart = function (topProducts) {
    const canvas = document.getElementById('topProductsPieChart');
    if (!canvas) return;

    // Destroy existing chart if any
    if (this.pieChartInstance) {
        this.pieChartInstance.destroy();
    }

    if (topProducts.length === 0) {
        canvas.parentElement.innerHTML = '<div class="no-data" style="text-align:center;padding:40px;color:var(--text-light);">គ្មានទិន្នន័យសម្រាប់បង្ហាញ</div>';
        return;
    }

    const ctx = canvas.getContext('2d');
    const colors = ['#6F4E37', '#D4A574', '#C9A961', '#8B6B55', '#4A3428'];
    const totalSales = topProducts.reduce((sum, [, qty]) => sum + qty, 0);

    this.pieChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: topProducts.map(([name]) => name),
            datasets: [{
                data: topProducts.map(([, qty]) => qty),
                backgroundColor: colors.slice(0, topProducts.length),
                borderWidth: 4,
                borderColor: '#fff',
                hoverBorderWidth: 5,
                hoverBorderColor: '#fff',
                hoverOffset: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1200,
                easing: 'easeOutBounce'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            family: "'Kantumruy Pro', sans-serif",
                            size: 15,
                            weight: '600'
                        },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            return data.labels.map((label, i) => {
                                const value = data.datasets[0].data[i];
                                const percentage = ((value / totalSales) * 100).toFixed(1);
                                return {
                                    text: `${label}: ${value} ទំនិញ (${percentage}%)`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    strokeStyle: data.datasets[0].backgroundColor[i],
                                    lineWidth: 0,
                                    hidden: false,
                                    index: i
                                };
                            });
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(111, 78, 55, 0.95)',
                    titleFont: {
                        family: "'Kantumruy Pro', sans-serif",
                        size: 16,
                        weight: '600'
                    },
                    bodyFont: {
                        family: "'Kantumruy Pro', sans-serif",
                        size: 15
                    },
                    padding: 15,
                    cornerRadius: 10,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `  ${label}: ${value} ទំនិញ (${percentage}%)`;
                        }
                    }
                },
                datalabels: {
                    color: '#fff',
                    font: {
                        family: "'Kantumruy Pro', sans-serif",
                        size: 16,
                        weight: '700'
                    },
                    formatter: function(value, context) {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${value}\n(${percentage}%)`;
                    },
                    textShadowColor: 'rgba(0, 0, 0, 0.6)',
                    textShadowBlur: 5,
                    textAlign: 'center',
                    anchor: 'center',
                    align: 'center',
                    offset: 0
                }
            },
            layout: {
                padding: 20
            }
        },
        plugins: [ChartDataLabels]
    });
};
