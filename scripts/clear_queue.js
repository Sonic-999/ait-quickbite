import Database from 'better-sqlite3';
const db = new Database('server/quickbite.db');
const result = db.prepare("UPDATE Orders SET status = 'Completed' WHERE status != 'Completed'").run();
console.log('Orders updated to Completed:', result.changes);
