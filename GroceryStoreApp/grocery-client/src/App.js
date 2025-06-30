import React, { useState, useEffect } from 'react';
import './App.css';
import AuthScreen from './components/AuthScreen';
import SupplierDashboard from './components/SupplierDashboard';
import OwnerDashboard from './components/OwnerDashboard';

function App() {
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('currentUser');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const [showAdminAuth, setShowAdminAuth] = useState(false);

    useEffect(() => {
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('currentUser');
        }
    }, [user]);

    const handleLogin = (userData) => {
        setUser(userData);
        setShowAdminAuth(false);
    };

    const handleLogout = () => {
        setUser(null);
        setShowAdminAuth(false);
    };

    const handleAdminModeToggle = () => {
        setShowAdminAuth(true);
        setUser(null);
    };

    const handleBackToSupplierLogin = () => {
        setShowAdminAuth(false);
    };

    return (
        <div className="App">
            {!user && !showAdminAuth && (
                <button
                    onClick={handleAdminModeToggle}
                    className="admin-login-button"
                    title="כניסה למנהל"
                >
                    כניסת מנהל
                </button>
            )}

            {!user ? (
                <AuthScreen
                    onLogin={handleLogin}
                    isAdminMode={showAdminAuth}
                    onToggleToSupplierLogin={handleBackToSupplierLogin}
                />
            ) : (
                <div className="dashboard-container">
                    <header className="app-header">
                        <h1>ברוך הבא, {user.type === 'supplier' ? user.companyName : 'בעל המכולת'}!</h1>
                        <button onClick={handleLogout} className="logout-button">התנתק</button>
                    </header>
                    {user.type === 'supplier' ? (
                        <SupplierDashboard supplierId={user.id} />
                    ) : (
                        <OwnerDashboard />
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
