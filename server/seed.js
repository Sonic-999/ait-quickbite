import db, { initDatabase } from './db.js';

export function seedDatabase() {
  initDatabase();

  // 1. Seed Users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM Users').get().count;
  if (userCount === 0) {
    console.log('[Seed] Seeding Users table...');
    const insertUser = db.prepare(`
      INSERT INTO Users (id, name, email, phone, role, shop_name)
      VALUES (@id, @name, @email, @phone, @role, @shop_name)
    `);

    const users = [
      {
        id: 'usr-std-01',
        name: 'Aarav Sharma',
        email: 'aarav.sharma@aitpune.edu.in',
        phone: '9876543210',
        role: 'student',
        shop_name: null,
      },
      {
        id: 'usr-std-02',
        name: 'Priya Patel',
        email: 'priya.patel@aitpune.edu.in',
        phone: '9876543211',
        role: 'student',
        shop_name: null,
      },
      {
        id: 'usr-std-03',
        name: 'Rohan Deshmukh',
        email: 'rohan.deshmukh@aitpune.edu.in',
        phone: '9876543212',
        role: 'student',
        shop_name: null,
      },
      {
        id: 'usr-ven-jc',
        name: 'Sanjay Kadam',
        email: 'juicecenter@aitpune.edu.in',
        phone: '9822012345',
        role: 'vendor',
        shop_name: 'Juice Center',
      },
      {
        id: 'usr-ven-mc',
        name: 'Rajesh Verma',
        email: 'maincanteen@aitpune.edu.in',
        phone: '9822054321',
        role: 'vendor',
        shop_name: 'Main Canteen',
      },
      {
        id: 'usr-ven-nb',
        name: 'Anita D\'Souza',
        email: 'nescafe@aitpune.edu.in',
        phone: '9822098765',
        role: 'vendor',
        shop_name: 'Nescafe Booth',
      },
      {
        id: 'usr-ven-cb',
        name: 'Sunil More',
        email: 'bakery@aitpune.edu.in',
        phone: '9822045678',
        role: 'vendor',
        shop_name: 'Campus Bakery',
      },
    ];

    const insertManyUsers = db.transaction((userList) => {
      for (const u of userList) insertUser.run(u);
    });
    insertManyUsers(users);
    console.log(`[Seed] Seeded ${users.length} users.`);
  }

  // 2. Seed MenuItems
  const itemCount = db.prepare('SELECT COUNT(*) as count FROM MenuItems').get().count;
  if (itemCount === 0) {
    console.log('[Seed] Seeding MenuItems table...');
    const insertItem = db.prepare(`
      INSERT INTO MenuItems (
        id, shop_id, shop_name, category, category_id, name, desc, price,
        badge, is_veg, image, alt, fallback_image, is_available, display_order
      ) VALUES (
        @id, @shop_id, @shop_name, @category, @category_id, @name, @desc, @price,
        @badge, @is_veg, @image, @alt, @fallback_image, @is_available, @display_order
      )
    `);

    const menuItems = [
      // ==========================================
      // JUICE CENTER - BESTSELLERS
      // ==========================================
      {
        id: 'jc-bs-orange',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Bestsellers',
        category_id: 'bestsellers',
        name: 'Fresh Orange Juice',
        desc: 'Freshly squeezed with no added sugar or preservatives. 100% natural Nagpur sweet oranges.',
        price: 40,
        badge: 'Bestseller',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?juice',
        alt: 'Juice',
        fallback_image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 1,
      },
      {
        id: 'jc-bs-samosa',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Bestsellers',
        category_id: 'bestsellers',
        name: 'Crispy Punjabi Samosa (2 pcs)',
        desc: 'Hot golden-crusted samosas stuffed with spiced potatoes and green peas, served with mint & tamarind chutneys.',
        price: 30,
        badge: 'Top Rated',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?samosa',
        alt: 'Samosa',
        fallback_image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 2,
      },
      {
        id: 'jc-bs-sandwich',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Bestsellers',
        category_id: 'bestsellers',
        name: 'Grilled Paneer Brown Sandwich',
        desc: 'Crisp toasted brown bread filled with spiced cottage cheese cubes, capsicum, and mint spread.',
        price: 55,
        badge: 'Chef Special',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?sandwich',
        alt: 'Sandwich',
        fallback_image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 3,
      },
      {
        id: 'jc-bs-mango',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Bestsellers',
        category_id: 'bestsellers',
        name: 'Alphonso Mango Thick Shake',
        desc: 'Rich mango pulp blended with creamy milk, topped with crunchy sliced cashews and almonds.',
        price: 55,
        badge: 'Campus Favorite',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?juice',
        alt: 'Juice',
        fallback_image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 4,
      },
      {
        id: 'jc-bs-banana-pb',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Bestsellers',
        category_id: 'bestsellers',
        name: 'Banana Peanut Butter Shake',
        desc: 'High-protein blend of ripe bananas, roasted peanut butter, pure honey, and chilled dairy milk.',
        price: 50,
        badge: 'Energy Boost',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?juice',
        alt: 'Juice',
        fallback_image: 'https://images.unsplash.com/photo-1553787499-6f9133860278?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 5,
      },

      // ==========================================
      // JUICE CENTER - JUICES
      // ==========================================
      {
        id: 'jc-j-orange',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Juices',
        category_id: 'juices',
        name: 'Fresh Orange Juice',
        desc: 'Freshly squeezed with no added sugar or preservatives. 100% natural Nagpur sweet oranges.',
        price: 40,
        badge: 'Bestseller',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?juice',
        alt: 'Juice',
        fallback_image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 11,
      },
      {
        id: 'jc-j-mosambi',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Juices',
        category_id: 'juices',
        name: 'Sweet Lime (Mosambi) Juice',
        desc: 'Refreshing cold-pressed sweet lime juice served chilled with a pinch of rock salt.',
        price: 40,
        badge: '100% Pure',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?juice',
        alt: 'Juice',
        fallback_image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 12,
      },
      {
        id: 'jc-j-watermelon',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Juices',
        category_id: 'juices',
        name: 'Fresh Watermelon Cooler',
        desc: 'Hydrating summer cooler made from freshly crushed seedless watermelons and fresh mint leaves.',
        price: 35,
        badge: 'Hydrating',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?juice',
        alt: 'Juice',
        fallback_image: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 13,
      },
      {
        id: 'jc-j-pineapple',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Juices',
        category_id: 'juices',
        name: 'Pineapple Punch',
        desc: 'Tangy and sweet fresh pineapple juice extracted to order with a hint of roasted black pepper.',
        price: 45,
        badge: null,
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?juice',
        alt: 'Juice',
        fallback_image: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 14,
      },
      {
        id: 'jc-j-anaar',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Juices',
        category_id: 'juices',
        name: 'Pure Pomegranate (Anaar) Juice',
        desc: 'Antioxidant-rich pure pomegranate pearls pressed fresh without dilution or artificial color.',
        price: 60,
        badge: 'Premium',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?juice',
        alt: 'Juice',
        fallback_image: 'https://images.unsplash.com/photo-1558818498-28c1e002b655?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 15,
      },

      // ==========================================
      // JUICE CENTER - SHAKES
      // ==========================================
      {
        id: 'jc-s-banana-pb',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Shakes',
        category_id: 'shakes',
        name: 'Banana Peanut Butter Shake',
        desc: 'High-protein blend of ripe bananas, roasted peanut butter, pure honey, and chilled dairy milk.',
        price: 50,
        badge: 'Campus Favorite',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?juice',
        alt: 'Juice',
        fallback_image: 'https://images.unsplash.com/photo-1553787499-6f9133860278?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 21,
      },
      {
        id: 'jc-s-mango',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Shakes',
        category_id: 'shakes',
        name: 'Alphonso Mango Thick Shake',
        desc: 'Rich mango pulp blended with creamy milk, topped with crunchy sliced cashews and almonds.',
        price: 55,
        badge: 'Seasonal Top Pick',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?juice',
        alt: 'Juice',
        fallback_image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 22,
      },
      {
        id: 'jc-s-strawberry',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Shakes',
        category_id: 'shakes',
        name: 'Fresh Strawberry Milkshake',
        desc: 'Chilled Mahabaleshwar strawberry crush blended smooth with dairy milk and vanilla cream.',
        price: 50,
        badge: null,
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?juice',
        alt: 'Juice',
        fallback_image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 23,
      },
      {
        id: 'jc-s-chocolate',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Shakes',
        category_id: 'shakes',
        name: 'Chocolate Energy Smoothie',
        desc: 'Cocoa blend with rolled oats, banana, and chilled milk for quick study breaks and workouts.',
        price: 55,
        badge: null,
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?juice',
        alt: 'Juice',
        fallback_image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 24,
      },

      // ==========================================
      // JUICE CENTER - SNACKS
      // ==========================================
      {
        id: 'jc-sn-samosa',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Snacks',
        category_id: 'snacks',
        name: 'Crispy Punjabi Samosa (2 pcs)',
        desc: 'Hot golden-crusted samosas stuffed with spiced potatoes and green peas, served with mint & tamarind chutneys.',
        price: 30,
        badge: 'Hot & Fresh',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?samosa',
        alt: 'Samosa',
        fallback_image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 31,
      },
      {
        id: 'jc-sn-sandwich',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Snacks',
        category_id: 'snacks',
        name: 'Grilled Paneer Brown Sandwich',
        desc: 'Crisp toasted brown bread filled with spiced cottage cheese cubes, capsicum, and mint spread.',
        price: 55,
        badge: 'Chef Special',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?sandwich',
        alt: 'Sandwich',
        fallback_image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 32,
      },
      {
        id: 'jc-sn-samosa-pav',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Snacks',
        category_id: 'snacks',
        name: 'Mumbai Samosa Pav',
        desc: 'Golden fried samosa tucked inside fresh soft pav with dry garlic chutney and green chili.',
        price: 25,
        badge: null,
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?samosa',
        alt: 'Samosa',
        fallback_image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 33,
      },
      {
        id: 'jc-sn-cheese-sandwich',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Snacks',
        category_id: 'snacks',
        name: 'Corn & Cheese Grilled Sandwich',
        desc: 'Triple-decker grilled sandwich stuffed with sweet corn, molten mozzarella cheese, and herbs.',
        price: 60,
        badge: 'Bestseller',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?sandwich',
        alt: 'Sandwich',
        fallback_image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 34,
      },
      {
        id: 'jc-sn-fruit-bowl',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Snacks',
        category_id: 'snacks',
        name: 'Mixed Seasonal Fruit Bowl',
        desc: 'Cut pieces of watermelon, apple, papaya, and pomegranate tossed in spicy tangy chaat masala.',
        price: 50,
        badge: 'Healthy',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?samosa',
        alt: 'Snacks',
        fallback_image: 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 35,
      },
      {
        id: 'jc-sn-fries',
        shop_id: 'juice-center',
        shop_name: 'Juice Center',
        category: 'Snacks',
        category_id: 'snacks',
        name: 'Peri Peri Crispy Fries',
        desc: 'Freshly fried golden potato fingers dusted generously with zesty peri peri spice seasoning.',
        price: 45,
        badge: null,
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?sandwich',
        alt: 'Snacks',
        fallback_image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 36,
      },

      // ==========================================
      // MAIN CANTEEN ITEMS
      // ==========================================
      {
        id: 'mc-1',
        shop_id: 'main-canteen',
        shop_name: 'Main Canteen',
        category: 'Meals',
        category_id: 'meals',
        name: 'Special Student Veg Thali',
        desc: '2 rotis, dal tadka, paneer sabzi, rice, and salad.',
        price: 90,
        badge: 'Popular',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?curry',
        alt: 'Thali',
        fallback_image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 101,
      },
      {
        id: 'mc-2',
        shop_id: 'main-canteen',
        shop_name: 'Main Canteen',
        category: 'South Indian',
        category_id: 'south-indian',
        name: 'Crispy Masala Dosa',
        desc: 'Served with hot sambar and fresh coconut chutney.',
        price: 55,
        badge: 'Crispy',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?crepe',
        alt: 'Dosa',
        fallback_image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 102,
      },
      {
        id: 'mc-3',
        shop_id: 'main-canteen',
        shop_name: 'Main Canteen',
        category: 'North Indian',
        category_id: 'north-indian',
        name: 'Chole Bhature (2 pcs)',
        desc: 'Spiced Amritsari chole with pickled onions and mint chili.',
        price: 70,
        badge: 'Student Choice',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?curry',
        alt: 'Chole',
        fallback_image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 103,
      },

      // ==========================================
      // NESCAFE BOOTH ITEMS
      // ==========================================
      {
        id: 'nb-1',
        shop_id: 'nescafe-booth',
        shop_name: 'Nescafe Booth',
        category: 'Beverages',
        category_id: 'beverages',
        name: 'Signature Iced Cold Coffee',
        desc: 'Chilled rich coffee with creamy froth.',
        price: 45,
        badge: 'Bestseller',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?coffee',
        alt: 'Cold Coffee',
        fallback_image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 201,
      },
      {
        id: 'nb-2',
        shop_id: 'nescafe-booth',
        shop_name: 'Nescafe Booth',
        category: 'Snacks',
        category_id: 'snacks',
        name: 'Veg Cheese Grilled Sandwich',
        desc: 'Toasted golden with capsicum, corn, and mozzarella cheese.',
        price: 65,
        badge: 'Cheesy',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?sandwich',
        alt: 'Sandwich',
        fallback_image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 202,
      },
      {
        id: 'nb-3',
        shop_id: 'nescafe-booth',
        shop_name: 'Nescafe Booth',
        category: 'Hot Food',
        category_id: 'hot-food',
        name: 'Butter Masala Maggi',
        desc: 'Classic double masala noodles cooked with butter and veggies.',
        price: 40,
        badge: 'Warm & Comfort',
        is_veg: 1,
        image: 'https://source.unsplash.com/400x400/?noodles',
        alt: 'Noodles',
        fallback_image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80',
        is_available: 1,
        display_order: 203,
      },
    ];

    const insertManyItems = db.transaction((items) => {
      for (const item of items) insertItem.run(item);
    });
    insertManyItems(menuItems);
    console.log(`[Seed] Seeded ${menuItems.length} menu items.`);
  }

  // 3. Seed Orders
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM Orders').get().count;
  if (orderCount === 0) {
    console.log('[Seed] Seeding Orders table...');
    const insertOrder = db.prepare(`
      INSERT INTO Orders (
        id, token, user_id, user_name, shop_name, status, pickup_time,
        due_time, estimated_time, total, utr, items, upi_string
      ) VALUES (
        @id, @token, @user_id, @user_name, @shop_name, @status, @pickup_time,
        @due_time, @estimated_time, @total, @utr, @items, @upi_string
      )
    `);

    const sampleOrders = [
      {
        id: 'ord-101',
        token: '42',
        user_id: 'usr-std-01',
        user_name: 'Aarav Sharma',
        shop_name: 'Juice Center',
        status: 'Pending',
        pickup_time: 'In 10 Minutes',
        due_time: '2:15 PM',
        estimated_time: 'In 10 mins (approx. 2:15 PM)',
        total: 95,
        utr: '987654321098',
        items: JSON.stringify([
          { name: '2x Fresh Orange Juice', price: 80, quantity: 2 },
          { name: '1x Crispy Punjabi Samosa (2 pcs)', price: 15, quantity: 1 },
        ]),
        upi_string: 'upi://pay?pa=your-canteen-upi@okbank&pn=AIT%20QuickBite&am=95.00&cu=INR&tn=CampusOrder',
      },
      {
        id: 'ord-102',
        token: '18',
        user_id: 'usr-std-02',
        user_name: 'Priya Patel',
        shop_name: 'Nescafe Booth',
        status: 'Pending',
        pickup_time: 'In 20 Minutes',
        due_time: '2:25 PM',
        estimated_time: 'In 20 mins (approx. 2:25 PM)',
        total: 110,
        utr: '829104829102',
        items: JSON.stringify([
          { name: '1x Signature Iced Cold Coffee', price: 45, quantity: 1 },
          { name: '1x Veg Cheese Grilled Sandwich', price: 65, quantity: 1 },
        ]),
        upi_string: 'upi://pay?pa=your-canteen-upi@okbank&pn=AIT%20QuickBite&am=110.00&cu=INR&tn=CampusOrder',
      },
      {
        id: 'ord-103',
        token: '88',
        user_id: 'usr-std-03',
        user_name: 'Rohan Deshmukh',
        shop_name: 'Main Canteen',
        status: 'Pending',
        pickup_time: 'In 20 Minutes',
        due_time: '2:30 PM',
        estimated_time: 'In 25 mins (approx. 2:30 PM)',
        total: 120,
        utr: '441298571029',
        items: JSON.stringify([
          { name: '1x Special Student Veg Thali', price: 90, quantity: 1 },
          { name: '1x Crispy Masala Dosa', price: 30, quantity: 1 },
        ]),
        upi_string: 'upi://pay?pa=your-canteen-upi@okbank&pn=AIT%20QuickBite&am=120.00&cu=INR&tn=CampusOrder',
      },
      {
        id: 'ord-104',
        token: '29',
        user_id: 'usr-std-01',
        user_name: 'Aarav Sharma',
        shop_name: 'Juice Center',
        status: 'Ready',
        pickup_time: 'In 10 Minutes',
        due_time: '2:00 PM',
        estimated_time: 'Ready now for pickup!',
        total: 75,
        utr: '771928401928',
        items: JSON.stringify([
          { name: '1x Alphonso Mango Thick Shake', price: 50, quantity: 1 },
          { name: '1x Mumbai Samosa Pav', price: 25, quantity: 1 },
        ]),
        upi_string: 'upi://pay?pa=your-canteen-upi@okbank&pn=AIT%20QuickBite&am=75.00&cu=INR&tn=CampusOrder',
      },
    ];

    const insertManyOrders = db.transaction((orderList) => {
      for (const ord of orderList) insertOrder.run(ord);
    });
    insertManyOrders(sampleOrders);
    console.log(`[Seed] Seeded ${sampleOrders.length} orders.`);
  }

  console.log('[Seed] Database initialization and seed completed successfully.');
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  seedDatabase();
}
