require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then(connection => {
        console.log('Connected to MySQL database!');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to MySQL database:', err);
    });

module.exports = {
    query: async (sql, params) => {
        const [rows] = await pool.execute(sql, params);
        return rows;
    },
    pool: pool,
};
