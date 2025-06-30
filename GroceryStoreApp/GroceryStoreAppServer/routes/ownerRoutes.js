const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/orders', async (req, res) => {
    const { supplier_id, items } = req.body;

    if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Missing supplier_id or order items.' });
    }

    let connection;
    try {
        connection = await db.pool.getConnection();
        await connection.beginTransaction();

        const [orderResult] = await connection.execute(
            'INSERT INTO Orders (supplier_id, order_date, status) VALUES (?, NOW(), ?)',
            [supplier_id, 'pending']
        );
        const orderId = orderResult.insertId;

        for (const item of items) {
            const { good_id, quantity } = item;
            const [goodInfoRows] = await connection.execute(
                'SELECT price_per_item, min_quantity FROM Goods WHERE id = ? AND supplier_id = ?',
                [good_id, supplier_id]
            );

            if (goodInfoRows.length === 0) {
                throw new Error(`Good ID ${good_id} not found or does not belong to supplier ${supplier_id}`);
            }

            if (quantity < goodInfoRows[0].min_quantity) {
                throw new Error(`Quantity for ${good_id} is less than minimum required (${goodInfoRows[0].min_quantity})`);
            }

            const itemPrice = goodInfoRows[0].price_per_item;

            await connection.execute(
                'INSERT INTO OrderItems (order_id, good_id, quantity, item_price) VALUES (?, ?, ?, ?)',
                [orderId, good_id, quantity, itemPrice]
            );
        }

        await connection.commit();
        res.status(201).json({ message: 'Order placed successfully!', orderId: orderId });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error placing order:', error);
        res.status(500).json({ message: `Internal server error placing order: ${error.message}` });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

router.get('/orders', async (req, res) => {
    try {
        const ordersResult = await db.query(
            `SELECT o.id AS order_id, o.order_date, o.status,
                    s.company_name AS supplier_company, s.contact_person AS supplier_contact, s.phone_number AS supplier_phone,
                    oi.quantity, oi.item_price,
                    g.product_name, g.min_quantity
             FROM Orders o
             JOIN Suppliers s ON o.supplier_id = s.id
             JOIN OrderItems oi ON o.id = oi.order_id
             JOIN Goods g ON oi.good_id = g.id
             ORDER BY o.order_date DESC`
        );

        const ordersMap = new Map();
        ordersResult.forEach(row => {
            if (!ordersMap.has(row.order_id)) {
                ordersMap.set(row.order_id, {
                    orderId: row.order_id,
                    orderDate: row.order_date,
                    status: row.status,
                    supplier: {
                        companyName: row.supplier_company,
                        contactPerson: row.supplier_contact,
                        phoneNumber: row.supplier_phone
                    },
                    items: []
                });
            }
            ordersMap.get(row.order_id).items.push({
                productName: row.product_name,
                quantity: row.quantity,
                itemPrice: row.item_price,
                minQuantity: row.min_quantity
            });
        });

        res.status(200).json(Array.from(ordersMap.values()));

    } catch (error) {
        console.error('Error fetching owner orders:', error);
        res.status(500).json({ message: 'Internal server error fetching orders.' });
    }
});

router.patch('/orders/:orderId/complete', async (req, res) => {
    const { orderId } = req.params;
    try {
        const result = await db.query(
            'UPDATE Orders SET status = ? WHERE id = ? AND status = ?',
            ['completed', orderId, 'in_progress']
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Order not found or cannot be completed (status is not "in_progress").' });
        }
        res.status(200).json({ message: `Order ${orderId} completed successfully!` });
    } catch (error) {
        console.error('Error completing order:', error);
        res.status(500).json({ message: 'Internal server error completing order.' });
    }
});

module.exports = router;
