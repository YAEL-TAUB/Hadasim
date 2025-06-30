const express = require('express');
const router = express.Router();
// אין צורך ב-bcrypt כאן, כי כניסת מנהל תהיה ללא סיסמה.

// נקודת קצה לכניסת מנהל ללא סיסמה
router.post('/login', async (req, res) => {
    // לצורך הפרויקט, כניסת המנהל היא אוטומטית ללא צורך באימות סיסמה מול DB.
    // במערכת אמיתית, כדאי לאחסן את פרטי המנהל (ואת הגיבוב של הסיסמה) במסד נתונים
    // או במשתני סביבה מאובטחים.
    try {
        res.status(200).json({ message: 'Admin login successful!', adminId: 'fixed_admin_id', type: 'owner', success: true });
    } catch (error) {
        console.error('Error during admin login:', error);
        res.status(500).json({ message: 'Internal server error during admin login.' });
    }
});

module.exports = router;
