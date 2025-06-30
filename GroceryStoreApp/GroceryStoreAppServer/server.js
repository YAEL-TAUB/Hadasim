require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');

const supplierRoutes = require('./routes/supplierRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/suppliers', supplierRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to the Grocery Store API!');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Access it at http://localhost:${port}`);
});
