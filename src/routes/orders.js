<<<<<<< HEAD
// Order Routes
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const socketService = require('../services/socket');

// Middleware to attach broadcast function to request
router.use((req, res, next) => {
    req.broadcast = (event, data) => {
        socketService.broadcast(event, data);
    };
    next();
});

// GET /api/orders - Get all orders
router.get('/', orderController.getAllOrders);

// GET /api/orders/:id - Get specific order
router.get('/:id', orderController.getOrder);

// POST /api/orders - Create new order
router.post('/', orderController.createOrder);

// DELETE /api/orders/:id - Delete order
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
=======
const express = require('express');
const { v4: uuidv4 } = require('uuid');

function generateReceiptNumber() {
    const date  = new Date();
    const year  = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day   = String(date.getDate()).padStart(2, '0');
    const rand  = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}${month}${day}${rand}`;
}

module.exports = function ordersRoutes(db, broadcast) {
    const router = express.Router();

    // GET orders (with optional date / user filters)
    router.get('/', (req, res) => {
        try {
            const { date, userId, startDate, endDate } = req.query;
            let query = 'SELECT * FROM orders WHERE 1=1';
            const params = [];

            if (date)      { query += ' AND DATE(date) = ?';    params.push(date); }
            if (startDate) { query += ' AND DATE(date) >= ?';   params.push(startDate); }
            if (endDate)   { query += ' AND DATE(date) <= ?';   params.push(endDate); }
            if (userId)    { query += ' AND userId = ?';        params.push(userId); }
            query += ' ORDER BY date DESC';

            const orders = db.prepare(query).all(...params);
            res.json({ success: true, orders });
        } catch (error) {
            console.error('Get orders error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // GET single order
    router.get('/:id', (req, res) => {
        try {
            const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
            res.json({ success: true, order });
        } catch (error) {
            console.error('Get order error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // POST create order
    router.post('/', (req, res) => {
        try {
            const { items, subtotal, discountPercent, discountAmount, total, paymentMethod, userId, userName } = req.body;
            const id            = uuidv4();
            const receiptNumber = generateReceiptNumber();
            const date          = new Date().toISOString();

            db.prepare(`
                INSERT INTO orders (id, receiptNumber, date, items, subtotal, discountPercent, discountAmount, total, paymentMethod, userId, userName)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, receiptNumber, date, JSON.stringify(items), subtotal, discountPercent || 0, discountAmount || 0, total, paymentMethod || 'cash', userId, userName);

            broadcast('order-created', { id, receiptNumber, date, items, subtotal, discountPercent, discountAmount, total, paymentMethod, userId, userName });
            res.json({ success: true, message: 'Order created successfully', order: { id, receiptNumber, date, items, subtotal, discountPercent, discountAmount, total, paymentMethod, userId, userName } });
        } catch (error) {
            console.error('Create order error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // DELETE order
    router.delete('/:id', (req, res) => {
        try {
            db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
            broadcast('order-deleted', { id: req.params.id });
            res.json({ success: true, message: 'Order deleted successfully' });
        } catch (error) {
            console.error('Delete order error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    return router;
};
>>>>>>> acbaef74e4deb37ef63c984d184b45dcbd99c93d
