import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

function SupplierDashboard({ supplierId }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const fetchSupplierOrders = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get(`${API_BASE_URL}/suppliers/${supplierId}/orders`);
            setOrders(response.data);
        } catch (err) {
            console.error('Error fetching supplier orders:', err.response?.data || err.message);
            setError('שגיאה בטעינת ההזמנות. נסה/י שוב מאוחר יותר.');
        } finally {
            setLoading(false);
        }
    }, [supplierId]);

    useEffect(() => {
        fetchSupplierOrders();
    }, [fetchSupplierOrders]);

    const handleApproveOrder = async (orderId) => {
        setMessage('');
        setMessageType('');
        try {
            const response = await axios.patch(`${API_BASE_URL}/suppliers/orders/${orderId}/approve`);
            setMessage(response.data.message);
            setMessageType('success');
            fetchSupplierOrders();
        } catch (err) {
            console.error('Error approving order:', err.response?.data || err.message);
            setMessage(err.response?.data?.message || 'שגיאה באישור ההזמנה.');
            setMessageType('error');
        }
    };

    if (loading) return <p className="loading-text">טוען הזמנות...</p>;

    return (
        <div className="supplier-dashboard">
            <h2>הזמנות שבוצעו עבורך</h2>
            {message && <div className={`message ${messageType}`}>{message}</div>}
            {error && <p className="message error">{error}</p>}
            {orders.length === 0 ? (
                <p>אין הזמנות זמינות כרגע.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>מספר הזמנה</th>
                            <th>תאריך הזמנה</th>
                            <th>סטטוס</th>
                            <th>פרטי פריטים</th>
                            <th>פעולות</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.orderId}>
                                <td>{order.orderId}</td>
                                <td>{new Date(order.orderDate).toLocaleDateString('he-IL')}</td>
                                <td>{order.status === 'pending' ? 'ממתין לאישור' : order.status === 'in_progress' ? 'בתהליך' : 'הושלם'}</td>
                                <td>
                                    <ul>
                                        {order.items.map((item, index) => (
                                            <li key={index}>
                                                {item.productName} - כמות: {item.quantity} (מחיר: {item.itemPrice} ש"ח לפריט, מינימום: {item.minQuantity})
                                            </li>
                                        ))}
                                    </ul>
                                </td>
                                <td>
                                    {order.status === 'pending' ? (
                                        <button onClick={() => handleApproveOrder(order.orderId)} className="add-good-button">
                                            אשר הזמנה
                                        </button>
                                    ) : (
                                        <span>{order.status === 'in_progress' ? 'אושר' : 'הושלם'}</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default SupplierDashboard;
