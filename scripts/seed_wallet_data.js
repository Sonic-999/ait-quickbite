import db from '../server/db.js';

const existing = db.prepare("SELECT id FROM Orders WHERE id = 'ord-std-meal-101'").get();
if (!existing) {
  const insertStmt = db.prepare(`
    INSERT INTO Orders (
      id, token, user_id, user_name, shop_name, status,
      pickup_time, due_time, estimated_time, total, utr, items, upi_string, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  insertStmt.run(
    'ord-std-meal-101',
    '77',
    'usr-std-01',
    'Aarav Sharma',
    'Main Canteen',
    'Completed',
    'In 15 Mins',
    '1:30 PM',
    'Ready now for pickup!',
    365,
    '910283746192',
    JSON.stringify([
      { id: 'mc-thali', name: 'Special Student Veg Thali', price: 90, quantity: 2, category: 'Meals' },
      { id: 'mc-dosa', name: 'Crispy Masala Dosa Combo', price: 120, quantity: 1, category: 'Meals' },
      { id: 'mc-chole', name: 'Chole Bhature Lunch Meal', price: 65, quantity: 1, category: 'Meals' },
    ]),
    'upi://pay?pa=your-canteen-upi@okbank&pn=AIT%20QuickBite&am=365.00&cu=INR&tn=CampusOrder',
    '2026-10-01 02:00:00'
  );

  console.log('Successfully inserted meal order ord-std-meal-101!');
} else {
  console.log('Meal order already exists.');
}
