// Product Model
const databaseService = require('../services/database');

class ProductModel {
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
        return this.db.prepare(`
            SELECT p.*, p.category_id as category, c.name as category_name, c.name_km as category_name_km
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        `).get(id);
    }

    findAll(filters = {}) {
        let query = `
            SELECT p.*, p.category_id as category, c.name as category_name, c.name_km as category_name_km
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.category && filters.category !== 'all') {
            query += ' AND p.category_id = ?';
            params.push(filters.category);
        }

        if (filters.search) {
            query += ' AND (p.name LIKE ? OR p.name_km LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        if (filters.active !== undefined) {
            query += ' AND p.active = ?';
            params.push(filters.active ? 1 : 0);
        }

        query += ' ORDER BY p.name';

        return this.db.prepare(query).all(...params);
    }

    create(productData) {
        const { name, name_km, category_id, price, salePrice = 0, image, icon = 'fa-box', description, active = 1 } = productData;
        const id = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.db.prepare(`
            INSERT INTO products (id, name, name_km, category_id, price, salePrice, image, icon, description, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, name, name_km || name, category_id, price, salePrice, image, icon, description, active ? 1 : 0);

        return this.findById(id);
    }

    update(id, updateData) {
        const { name, name_km, category_id, price, salePrice = 0, image, icon, description, active = 1 } = updateData;

        this.db.prepare(`
            UPDATE products
            SET name = ?, name_km = ?, category_id = ?, price = ?, salePrice = ?, image = ?, icon = ?, description = ?, active = ?
            WHERE id = ?
        `).run(name, name_km || name, category_id, price, salePrice, image, icon, description, active ? 1 : 0, id);

        return this.findById(id);
    }

    delete(id) {
        return this.db.prepare('DELETE FROM products WHERE id = ?').run(id);
    }
}

module.exports = new ProductModel();
