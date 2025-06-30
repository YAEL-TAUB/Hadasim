const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

router.post('/register', async (req, res) => {
    const { company_name, phone_number, contact_person, password, goods } = req.body;

    if (!company_name || !phone_number || !contact_person || !password || !goods || !Array.isArray(goods) || goods.some(g => !g.product_name || !g.price_per_item || !g.min_quantity)) {
        return res.status(400).json({ message: 'Missing required fields or invalid goods format.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const supplierResultRows = await db.query(
            'INSERT INTO Suppliers (company_name, phone_number, contact_person, password_hash) VALUES (?, ?, ?, ?)',
            [company_name, phone_number, contact_person, password_hash]
        );
        const supplierId = supplierResultRows.insertId;

        for (const good of goods) {
            await db.query(
                'INSERT INTO Goods (supplier_id, product_name, price_per_item, min_quantity) VALUES (?, ?, ?, ?)',
                [supplierId, good.product_name, good.price_per_item, good.min_quantity]
            );
        }

        res.status(201).json({ message: 'Supplier registered successfully!', supplierId: supplierId });

    } catch (error) {
        console.error('Error registering supplier:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Company name already exists.' });
        }
        res.status(500).json({ message: 'Internal server error during registration.' });
    }
});

router.post('/login', async (req, res) => {
    const { company_name, password } = req.body;

    try {
        const supplierResult = await db.query(
            'SELECT id, password_hash FROM Suppliers WHERE company_name = ?',
            [company_name]
        );

        if (supplierResult.length === 0) {
            return res.status(401).json({ message: 'Invalid company name or password.' });
        }

        const supplier = supplierResult[0];
        const isMatch = await bcrypt.compare(password, supplier.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid company name or password.' });
        }

        res.status(200).json({ message: 'Login successful!', supplierId: supplier.id });

    } catch (error) {
        console.error('Error logging in supplier:', error);
        res.status(500).json({ message: 'Internal server error during login.' });
    }
});

router.get('/', async (req, res) => {
    try {
        const suppliers = await db.query('SELECT id, company_name, phone_number, contact_person FROM Suppliers');
        res.status(200).json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ message: 'Internal server error fetching suppliers.' });
    }
});

router.get('/:supplierId/goods', async (req, res) => {
    const { supplierId } = req.params;
    try {
        const goods = await db.query('SELECT id, product_name, price_per_item, min_quantity FROM Goods WHERE supplier_id = ?', [supplierId]);
        res.status(200).json(goods);
    } catch (error) {
        console.error(`Error fetching goods for supplier ${supplierId}:`, error);
        res.status(500).json({ message: 'Internal server error fetching goods.' });
    }
});

router.get('/:supplierId/orders', async (req, res) => {
    const { supplierId } = req.params;
    try {
        const ordersResult = await db.query(
            `SELECT o.id, o.order_date, o.status,
                    oi.quantity, oi.item_price,
                    g.product_name, g.min_quantity
             FROM Orders o
             JOIN OrderItems oi ON o.id = oi.order_id
             JOIN Goods g ON oi.good_id = g.id
             WHERE o.supplier_id = ?
             ORDER BY o.order_date DESC`,
            [supplierId]
        );

        const ordersMap = new Map();
        ordersResult.forEach(row => {
            if (!ordersMap.has(row.id)) {
                ordersMap.set(row.id, {
                    orderId: row.id,
                    orderDate: row.order_date,
                    status: row.status,
                    items: []
                });
            }
            ordersMap.get(row.id).items.push({
                productName: row.product_name,
                quantity: row.quantity,
                itemPrice: row.item_price,
                minQuantity: row.min_quantity
            });
        });

        res.status(200).json(Array.from(ordersMap.values()));

    } catch (error) {
        console.error('Error fetching supplier orders:', error);
        res.status(500).json({ message: 'Internal server error fetching orders.' });
    }
});

router.patch('/orders/:orderId/approve', async (req, res) => {
    const { orderId } = req.params;
    try {
        const result = await db.query(
            'UPDATE Orders SET status = ? WHERE id = ? AND status = ?',
            ['in_progress', orderId, 'pending']
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Order not found or already approved/completed.' });
        }
        res.status(200).json({ message: `Order ${orderId} approved and status set to 'in_progress'.` });
    } catch (error) {
        console.error('Error approving order:', error);
        res.status(500).json({ message: 'Internal server error approving order.' });
    }
});

module.exports = router;
