import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

function AuthScreen({ onLogin, isAdminMode, onToggleToSupplierLogin }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [companyName, setCompanyName] = useState('');
    const [supplierPhoneNumber, setSupplierPhoneNumber] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [supplierPassword, setSupplierPassword] = useState('');
    const [goods, setGoods] = useState([{ product_name: '', price_per_item: '', min_quantity: '' }]);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        setMessage('');
        setMessageType('');

        if (!companyName || !supplierPhoneNumber || !contactPerson || !supplierPassword || goods.some(g => !g.product_name || !g.price_per_item || !g.min_quantity)) {
            setMessage('אנא מלא/י את כל השדות הנדרשים, כולל פרטי הסחורות.');
            setMessageType('error');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/suppliers/register`, {
                company_name: companyName,
                phone_number: supplierPhoneNumber,
                contact_person: contactPerson,
                password: supplierPassword,
                goods: goods.map(g => ({
                    ...g,
                    price_per_item: parseFloat(g.price_per_item),
                    min_quantity: parseInt(g.min_quantity)
                }))
            });
            setMessage(response.data.message);
            setMessageType('success');
            setCompanyName('');
            setSupplierPhoneNumber('');
            setContactPerson('');
            setSupplierPassword('');
            setGoods([{ product_name: '', price_per_item: '', min_quantity: '' }]);
            setIsRegistering(false);
        } catch (error) {
            console.error('Registration error:', error.response?.data || error.message);
            setMessage(error.response?.data?.message || 'שגיאה ברישום. נסה/י שוב.');
            setMessageType('error');
        }
    };

    const handleSupplierLogin = async (e) => {
        e.preventDefault();
        setMessage('');
        setMessageType('');

        if (!companyName || !supplierPassword) {
            setMessage('אנא מלא/י שם חברה וסיסמה.');
            setMessageType('error');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/suppliers/login`, {
                company_name: companyName,
                password: supplierPassword,
            });
            setMessage(response.data.message);
            setMessageType('success');
            onLogin({
                id: response.data.supplierId,
                type: 'supplier',
                companyName: companyName
            });
        } catch (error) {
            console.error('Login error:', error.response?.data || error.message);
            setMessage(error.response?.data?.message || 'שגיאה בהתחברות. וודא/י שם חברה וסיסמה.');
            setMessageType('error');
        }
    };

    const handleOwnerLogin = async (e) => {
        e.preventDefault();
        setMessage('');
        setMessageType('');

        try {
            const response = await axios.post(`${API_BASE_URL}/admin/login`); // נקודת קצה ללא סיסמה
            if (response.data.success) {
                onLogin({
                    id: response.data.adminId || 'owner_fixed_id',
                    type: 'owner',
                    name: 'בעל המכולת'
                });
            } else {
                setMessage(response.data.message || 'שגיאה בכניסת מנהל.');
                setMessageType('error');
            }
        } catch (error) {
            console.error('Owner login error:', error.response?.data || error.message);
            setMessage(error.response?.data?.message || 'שגיאה בהתחברות מנהל. נסה/י שוב.');
            setMessageType('error');
        }
    };

    const handleGoodChange = (index, field, value) => {
        const newGoods = [...goods];
        newGoods[index][field] = value;
        setGoods(newGoods);
    };

    const addGood = () => {
        setGoods([...goods, { product_name: '', price_per_item: '', min_quantity: '' }]);
    };

    const removeGood = (index) => {
        const newGoods = goods.filter((_, i) => i !== index);
        setGoods(newGoods);
    };

    return (
        <div className="auth-screen">
            {message && <div className={`message ${messageType}`}>{message}</div>}

            {isAdminMode ? (
                <div className="section-container auth-owner-section">
                    <h2>כניסת בעל המכולת</h2>
                    <p className="small-text">כניסה זו מאפשרת גישה למערכת הניהול.</p>
                    <form onSubmit={handleOwnerLogin}>
                        {/* שדה הסיסמה הוסר בהתאם לדרישה */}
                        <button type="submit">התחבר כבעל המכולת</button>
                    </form>
                    <p className="toggle-link" onClick={onToggleToSupplierLogin}>
                        חזור לכניסת ספק
                    </p>
                </div>
            ) : (
                <div className="section-container auth-supplier-section">
                    <h2>{isRegistering ? 'רישום ספק חדש' : 'כניסת ספק'}</h2>
                    {isRegistering ? (
                        <form onSubmit={handleRegister}>
                            <label>שם חברה:</label>
                            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />

                            <label>מספר טלפון:</label>
                            <input type="tel" value={supplierPhoneNumber} onChange={(e) => setSupplierPhoneNumber(e.target.value)} required />

                            <label>שם נציג קשר:</label>
                            <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} required />

                            <label>סיסמה:</label>
                            <input type="password" value={supplierPassword} onChange={(e) => setSupplierPassword(e.target.value)} required />

                            <label>סחורות מוצעות:</label>
                            <div className="goods-list-container">
                                {goods.map((good, index) => (
                                    <div key={index} className="goods-item">
                                        <div>
                                            <label>שם מוצר:</label>
                                            <input type="text" value={good.product_name} onChange={(e) => handleGoodChange(index, 'product_name', e.target.value)} required />
                                        </div>
                                        <div>
                                            <label>מחיר לפריט:</label>
                                            <input type="number" step="0.01" value={good.price_per_item} onChange={(e) => handleGoodChange(index, 'price_per_item', e.target.value)} required />
                                        </div>
                                        <div>
                                            <label>כמות מינימלית:</label>
                                            <input type="number" value={good.min_quantity} onChange={(e) => handleGoodChange(index, 'min_quantity', e.target.value)} required />
                                        </div>
                                        {goods.length > 1 && (
                                            <button type="button" onClick={() => removeGood(index)} className="remove-good-button">הסר</button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={addGood} className="add-good-button">הוסף מוצר</button>
                            </div>

                            <button type="submit">הירשם</button>
                        </form>
                    ) : (
                        <form onSubmit={handleSupplierLogin}>
                            <label>שם חברה:</label>
                            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />

                            <label>סיסמה:</label>
                            <input type="password" value={supplierPassword} onChange={(e) => setSupplierPassword(e.target.value)} required />

                            <button type="submit">התחבר כספק</button>
                        </form>
                    )}
                    <p className="toggle-link" onClick={() => setIsRegistering(!isRegistering)}>
                        {isRegistering ? 'כבר יש לך חשבון? התחבר/י' : 'אין לך חשבון? הירשם/י כספק חדש'}
                    </p>
                </div>
            )}
        </div>
    );
}

export default AuthScreen;
