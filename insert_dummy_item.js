import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'server/quickbite.db');

const db = new Database(dbPath);

const dummyItem = {
  id: 'jc-test-dragonfruit',
  shop_id: 'juice-center',
  shop_name: 'Juice Center',
  category: 'Juices',
  category_id: 'juices',
  name: 'Exotic Dragonfruit Mint Cooler',
  desc: 'Special experimental neon pink pitaya juice infused with crushed mountain mint and chia seeds.',
  price: 65,
  badge: 'New Arrival',
  is_veg: 1,
  image: 'https://source.unsplash.com/400x400/?juice',
  alt: 'Juice',
  fallback_image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=400&q=80',
  is_available: 1,
  display_order: 10,
};

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO MenuItems (
    id, shop_id, shop_name, category, category_id, name, desc, price,
    badge, is_veg, image, alt, fallback_image, is_available, display_order
  ) VALUES (
    @id, @shop_id, @shop_name, @category, @category_id, @name, @desc, @price,
    @badge, @is_veg, @image, @alt, @fallback_image, @is_available, @display_order
  )
`);

insertStmt.run(dummyItem);

console.log('✅ Dummy item successfully inserted into SQLite MenuItems table:');
console.log(dummyItem);
