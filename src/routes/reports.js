<<<<<<< HEAD
// Report Routes
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// GET /api/reports/summary - Get report summary
router.get('/summary', reportController.getSummary);

// GET /api/reports/sales-by-date - Get sales by date
router.get('/sales-by-date', reportController.getSalesByDate);

// GET /api/reports/top-products - Get top products
router.get('/top-products', reportController.getTopProducts);

module.exports = router;
=======
const express = require('express');

module.exports = function reportsRoutes(db) {
    const router = express.Router();

    router.get('/summary', (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            let dateFilter = '';
            const params  = [];

            if (startDate && endDate) {
                dateFilter = ' AND DATE(date) BETWEEN ? AND ?';
                params.push(startDate, endDate);
            }

            const totalRevenue  = db.prepare(`SELECT COALESCE(SUM(total), 0)          as total FROM orders WHERE 1=1${dateFilter}`).get(...params);
            const totalOrders   = db.prepare(`SELECT COUNT(*)                          as count FROM orders WHERE 1=1${dateFilter}`).get(...params);
            const totalDiscount = db.prepare(`SELECT COALESCE(SUM(discountAmount), 0) as total FROM orders WHERE 1=1${dateFilter}`).get(...params);

            const topProduct = db.prepare(`
                SELECT json_extract(value, '$.name')     as name,
                       SUM(json_extract(value, '$.quantity')) as qty
                FROM   orders, json_each(items)
                WHERE  1=1${dateFilter}
                GROUP  BY name
                ORDER  BY qty DESC
                LIMIT  1
            `).get(...params);

            res.json({
                success: true,
                stats: {
                    totalRevenue:  totalRevenue.total,
                    totalOrders:   totalOrders.count,
                    totalDiscount: totalDiscount.total,
                    topProduct:    topProduct ? topProduct.name : null,
                    avgOrderValue: totalOrders.count > 0 ? totalRevenue.total / totalOrders.count : 0
                }
            });
        } catch (error) {
            console.error('Get reports error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    return router;
};
>>>>>>> acbaef74e4deb37ef63c984d184b45dcbd99c93d
