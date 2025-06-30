import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Select from 'react-select';

const API_BASE_URL = 'http://localhost:3000/api';

function OwnerDashboard() {
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [goodsToOrder, setGoodsToOrder] = useState([{ selectedGood: null, quantity: '' }]);
    const [availableGoods, setAvailableGoods] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [loadingSuppliers, setLoadingSuppliers] = useState(true);
    const [loadingGoods, setLoadingGoods] = useState(false);
    const [orderMessage, setOrderMessage] = useState('');
    const [orderMessageType, setOrderMessageType] = useState('');
    const [ordersError, setOrdersError] = useState('');
    const [suppliersError, setSuppliersError] = useState('');
    const [goodsError, setGoodsError] = useState('');
    const [completeOrderMessage, setCompleteOrderMessage] = useState('');
    const [completeOrderMessageType, setCompleteOrderMessageType] = useState('');


    const fetchSuppliers = useCallback(async () => {
        setLoadingSuppliers(true);
        setSuppliersError('');
        try {
            const response = await axios.get(`${API_BASE_URL}/suppliers`);
            setSuppliers(response.data);
            if (response.data.length > 0) {
                setSelectedSupplier(response.data[0].id);
            }
        } catch (err) {
            console.error('Error fetching suppliers:', err.response?.data || err.message);
            setSuppliersError('שגיאה בטעינת הספקים. וודא/י שהשרת פועל.');
        } finally {
            setLoadingSuppliers(false);
        }
    }, []);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    useEffect(() => {
        const fetchGoodsForSelectedSupplier = async () => {
            if (selectedSupplier) {
                setLoadingGoods(true);
                setGoodsError('');
                try {
                    const response = await axios.get(`${API_BASE_URL}/suppliers/${selectedSupplier}/goods`);
                    const formattedGoods = response.data.map(good => ({
                        value: good.id,
                        label: good.product_name,
                        details: good
                    }));
                    setAvailableGoods(formattedGoods);
                    setGoodsToOrder([{ selectedGood: null, quantity: '' }]);
                } catch (err) {
                    console.error(`Error fetching goods for supplier ${selectedSupplier}:`, err.response?.data || err.message);
                    setGoodsError('שגיאה בטעינת המוצרים עבור הספק הנבחר.');
                    setAvailableGoods([]);
                } finally {
                    setLoadingGoods(false);
                }
            } else {
                setAvailableGoods([]);
                setGoodsToOrder([{ selectedGood: null, quantity: '' }]);
            }
        };
        fetchGoodsForSelectedSupplier();
    }, [selectedSupplier]);

    const fetchOwnerOrders = useCallback(async () => {
        setLoadingOrders(true);
        setOrdersError('');
        try {
            const response = await axios.get(`${API_BASE_URL}/owner/orders`);
            setOrders(response.data);
        } catch (err) {
            console.error('Error fetching owner orders:', err.response?.data || err.message);
            setOrdersError('שגיאה בטעינת ההזמנות שלך. נסה/י שוב מאוחר יותר.');
        } finally {
            setLoadingOrders(false);
        }
    }, []);

    useEffect(() => {
        fetchOwnerOrders();
    }, [fetchOwnerOrders]);

    const handleGoodToOrderChange = (index, field, value) => {
        const newGoods = [...goodsToOrder];
        if (field === 'selectedGood') {
            newGoods[index].selectedGood = value;
        } else {
            newGoods[index][field] = value;
        }
        setGoodsToOrder(newGoods);
    };

    const addGoodToOrder = () => {
        setGoodsToOrder([...goodsToOrder, { selectedGood: null, quantity: '' }]);
    };

    const removeGoodToOrder = (index) => {
        const newGoods = goodsToOrder.filter((_, i) => i !== index);
        setGoodsToOrder(newGoods);
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        setOrderMessage('');
        setOrderMessageType('');

        if (!selectedSupplier) {
            setOrderMessage('אנא בחר/י ספק.');
            setOrderMessageType('error');
            return;
        }
        if (goodsToOrder.some(item => !item.selectedGood || !item.selectedGood.value || parseInt(item.quantity) <= 0)) {
            setOrderMessage('אנא וודא/י שכל המוצרים והכמויות הוזנו כראוי (מוצר נבחר וכמות חיובית).');
            setOrderMessageType('error');
            return;
        }

        const orderData = {
            supplier_id: parseInt(selectedSupplier),
            items: goodsToOrder.map(item => ({
                good_id: item.selectedGood.value,
                quantity: parseInt(item.quantity)
            }))
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/owner/orders`, orderData);
            setOrderMessage(response.data.message);
            setOrderMessageType('success');
            setGoodsToOrder([{ selectedGood: null, quantity: '' }]);
            fetchOwnerOrders();
        } catch (err) {
            console.error('Order placement error:', err.response?.data || err.message);
            setOrderMessage(err.response?.data?.message || 'שגיאה בביצוע ההזמנה. וודא/י ID מוצר תקין וכמות מינימלית.');
            setOrderMessageType('error');
        }
    };

    const handleCompleteOrder = async (orderId) => {
        setCompleteOrderMessage('');
        setCompleteOrderMessageType('');
        try {
            const response = await axios.patch(`${API_BASE_URL}/owner/orders/${orderId}/complete`);
            setCompleteOrderMessage(response.data.message);
            setCompleteOrderMessageType('success');
            fetchOwnerOrders();
        } catch (err) {
            console.error('Error completing order:', err.response?.data || err.message);
            setCompleteOrderMessage(err.response?.data?.message || 'שגיאה בסיום ההזמנה.');
            setCompleteOrderMessageType('error');
        }
    };

    return (
        <div className="owner-dashboard">
            <h2>הזמנת סחורה</h2>
            {orderMessage && <div className={`message ${orderMessageType}`}>{orderMessage}</div>}
            <form onSubmit={handlePlaceOrder}>
                <label>בחר ספק:</label>
                {loadingSuppliers ? (
                    <p className="loading-text">טוען ספקים...</p>
                ) : suppliersError ? (
                    <p className="message error">{suppliersError}</p>
                ) : (
                    <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} required>
                        <option value="">בחר ספק...</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.company_name} (ID: {s.id})</option>
                        ))}
                    </select>
                )}

                <label className="section-label">הזמן פריטים:</label>
                <div className="goods-list-container">
                    {goodsToOrder.map((item, index) => (
                        <div key={index} className="goods-item">
                            <div>
                                <label>בחר מוצר:</label>
                                {loadingGoods ? (
                                    <p className="loading-text">טוען מוצרים...</p>
                                ) : goodsError ? (
                                    <p className="message error small">{goodsError}</p>
                                ) : (
                                    <Select
                                        options={availableGoods}
                                        value={item.selectedGood}
                                        onChange={(selectedOption) => handleGoodToOrderChange(index, 'selectedGood', selectedOption)}
                                        placeholder="הקלד/י שם מוצר..."
                                        noOptionsMessage={() => "אין מוצרים זמינים לספק זה או שלא נמצאו מוצרים"}
                                        isDisabled={!selectedSupplier || availableGoods.length === 0}
                                        styles={{
                                            singleValue: (provided) => ({ ...provided, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
                                            option: (provided) => ({ ...provided, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })
                                        }}
                                    />
                                )}
                            </div>
                            {item.selectedGood && item.selectedGood.details && (
                                <div className="selected-good-details">
                                    <p>מחיר ליחידה: <span>{item.selectedGood.details.price_per_item} ש"ח</span></p>
                                    <p>כמות מינימלית: <span>{item.selectedGood.details.min_quantity}</span></p>
                                </div>
                            )}
                            <div>
                                <label>כמות:</label>
                                <input type="number" value={item.quantity} onChange={(e) => handleGoodToOrderChange(index, 'quantity', e.target.value)} required />
                            </div>
                            {goodsToOrder.length > 1 && (
                                <button type="button" onClick={() => removeGoodToOrder(index)} className="remove-good-button">הסר</button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={addGoodToOrder} className="add-good-button">הוסף פריט</button>
                </div>
                <button type="submit">בצע הזמנה</button>
            </form>

            <hr />

            <h2>סטטוס הזמנות קיימות</h2>
            {completeOrderMessage && <div className={`message ${completeOrderMessageType}`}>{completeOrderMessage}</div>}
            {loadingOrders ? (
                <p className="loading-text">טוען הזמנות...</p>
            ) : ordersError ? (
                <p className="message error">{ordersError}</p>
            ) : orders.length === 0 ? (
                <p>אין הזמנות קיימות.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>מספר הזמנה</th>
                            <th>תאריך</th>
                            <th>סטטוס</th>
                            <th>שם ספק</th>
                            <th>פרטי פריטים</th>
                            <th>פעולות</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.orderId}>
                                <td>{order.orderId}</td>
                                <td>{new Date(order.orderDate).toLocaleDateString('he-IL')}</td>
                                <td>{order.status === 'pending' ? 'ממתין לאישור ספק' : order.status === 'in_progress' ? 'בתהליך' : 'הושלמה'}</td>
                                <td>{order.supplier.companyName}</td>
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
                                    {order.status === 'in_progress' ? (
                                        <button onClick={() => handleCompleteOrder(order.orderId)} className="add-good-button">
                                            אשר קבלה
                                        </button>
                                    ) : (
                                        <span>{order.status === 'completed' ? 'הושלמה' : 'ממתין לאישור ספק'}</span>
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

export default OwnerDashboard;
