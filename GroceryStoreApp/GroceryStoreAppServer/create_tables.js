const db = require('./db');

const createTablesSQL = `
CREATE TABLE IF NOT EXISTS Suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Goods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    price_per_item DECIMAL(10, 2) NOT NULL,
    min_quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES Suppliers(id)
);

CREATE TABLE IF NOT EXISTS Orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    FOREIGN KEY (supplier_id) REFERENCES Suppliers(id)
);

CREATE TABLE IF NOT EXISTS OrderItems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    good_id INT NOT NULL,
    quantity INT NOT NULL,
    item_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES Orders(id),
    FOREIGN KEY (good_id) REFERENCES Goods(id)
);
`;

async function createTables() {
    console.log('Attempting to create database tables...');
    try {
        const statements = createTablesSQL.split(';').filter(s => s.trim().length > 0);

        for (const sql of statements) {
            await db.query(sql);
            console.log(`Successfully executed: ${sql.substring(0, 50)}...`);
        }

        console.log('All tables created or already exist successfully!');
    } catch (error) {
        console.error('Error creating tables:', error);
        console.error('SQL Error:', error.sqlMessage || error.message);
        console.error('SQL Code:', error.sql);
    } finally {
        if (db.pool && typeof db.pool.end === 'function') {
            await db.pool.end();
            console.log('Database pool closed.');
        } else {
            console.log('Database pool not available or cannot be closed cleanly.');
            process.exit(1);
        }
        process.exit(0);
    }
}

createTables();
