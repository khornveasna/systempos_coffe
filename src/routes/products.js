<<<<<<< HEAD
// Product Routes
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const socketService = require('../services/socket');

// Middleware to attach broadcast function to request
router.use((req, res, next) => {
    req.broadcast = (event, data) => {
        socketService.broadcast(event, data);
    };
    next();
});

// GET /api/products - Get all products
router.get('/', productController.getAllProducts);

// GET /api/products/:id - Get specific product
router.get('/:id', productController.getProduct);

// POST /api/products - Create new product
router.post('/', productController.createProduct);

// PUT /api/products/:id - Update product
router.put('/:id', productController.updateProduct);

// DELETE /api/products/:id - Delete product
router.delete('/:id', productController.deleteProduct);

module.exports = router;
=======
const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = function productsRoutes(db, broadcast) {
    const router = express.Router();

    // GET products (with optional filters)
    router.get('/', (req, res) => {
        try {
            const { category, search, active } = req.query;
            let query = `
                SELECT p.*, c.name as category_name, c.name_km as category_name_km
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE 1=1
            `;
            const params = [];

            if (category && category !== 'all') {
                query += ' AND p.category_id = ?';
                params.push(category);
            }
            if (search) {
                query += ' AND (p.name LIKE ? OR p.name_km LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }
            if (active !== undefined) {
                query += ' AND p.active = ?';
                params.push(active ? 1 : 0);
            }
            query += ' ORDER BY p.name';

            const products = db.prepare(query).all(...params);
            res.json({ success: true, products });
        } catch (error) {
            console.error('Get products error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // GET single product
    router.get('/:id', (req, res) => {
        try {
            const product = db.prepare(`
                SELECT p.*, c.name as category_name, c.name_km as category_name_km
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.id = ?
            `).get(req.params.id);

            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found' });
            }
            res.json({ success: true, product });
        } catch (error) {
            console.error('Get product error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // POST create product
    router.post('/', (req, res) => {
        try {
            const { name, name_km, category_id, price, salePrice, image, icon, description, active } = req.body;
            const id = uuidv4();

            db.prepare(`
                INSERT INTO products (id, name, name_km, category_id, price, salePrice, image, icon, description, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, name, name_km || name, category_id, price, salePrice || 0, image, icon || 'fa-box', description, active ? 1 : 0);

            broadcast('product-created', { id, name, name_km, category_id, price, salePrice, image, icon, description, active });
            res.json({ success: true, message: 'Product created successfully', product: { id, name, name_km, category_id, price, salePrice, image, icon, description, active } });
        } catch (error) {
            console.error('Create product error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // PUT update product
    router.put('/:id', (req, res) => {
        try {
            const { name, name_km, category_id, price, salePrice, image, icon, description, active } = req.body;

            db.prepare(`
                UPDATE products
                SET name=?, name_km=?, category_id=?, price=?, salePrice=?, image=?, icon=?, description=?, active=?
                WHERE id=?
            `).run(name, name_km || name, category_id, price, salePrice || 0, image, icon, description, active ? 1 : 0, req.params.id);

            broadcast('product-updated', { id: req.params.id, name, name_km, category_id, price, salePrice, image, icon, description, active });
            res.json({ success: true, message: 'Product updated successfully' });
        } catch (error) {
            console.error('Update product error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // DELETE product
    router.delete('/:id', (req, res) => {
        try {
            db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
            broadcast('product-deleted', { id: req.params.id });
            res.json({ success: true, message: 'Product deleted successfully' });
        } catch (error) {
            console.error('Delete product error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    return router;
};
>>>>>>> acbaef74e4deb37ef63c984d184b45dcbd99c93d
