// Order Model
const databaseService = require('../services/database');

class OrderModel {
    constructor() {
        this._db = null;
    }

    get db() {
        if (!this._db) {
            this._db = databaseService.getDatabase();
        }
        return this._db;
    }

    findById(id) {
        return this.db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    }

    findAll(filters = {}) {
        let query = 'SELECT * FROM orders WHERE 1=1';
        const params = [];

        if (filters.date) {
            query += ' AND DATE(date) = ?';
            params.push(filters.date);
        }

        if (filters.startDate) {
            query += ' AND DATE(date) >= ?';
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ' AND DATE(date) <= ?';
            params.push(filters.endDate);
        }

        if (filters.userId) {
            query += ' AND userId = ?';
            params.push(filters.userId);
        }

        query += ' ORDER BY date DESC';

        return this.db.prepare(query).all(...params);
    }

    create(orderData) {
        const { 
            items, subtotal, discountPercent = 0, discountAmount = 0, total, 
            totalUSD = 0, paymentMethod = 'cash', 
            amountReceived = 0, amountReceivedUSD = 0, 
            changeAmount = 0, changeAmountUSD = 0, 
            exchangeRate = 4000,
            userId, userName 
        } = orderData;
        const id = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const receiptNumber = databaseService.generateReceiptNumber();
        const date = new Date().toISOString();

        this.db.prepare(`
            INSERT INTO orders (id, receiptNumber, date, items, subtotal, discountPercent, discountAmount, total, totalUSD, paymentMethod, amountReceived, amountReceivedUSD, changeAmount, changeAmountUSD, exchangeRate, userId, userName)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, receiptNumber, date, JSON.stringify(items), subtotal, discountPercent, discountAmount, total, totalUSD, paymentMethod, amountReceived, amountReceivedUSD, changeAmount, changeAmountUSD, exchangeRate, userId, userName);

        return this.findById(id);
    }

    delete(id) {
        return this.db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    }
}

module.exports = new OrderModel();
