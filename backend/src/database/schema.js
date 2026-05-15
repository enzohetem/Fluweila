const db = require("./db");

db.exec(`
  CREATE TABLE IF NOT EXISTS printers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    model TEXT,
    status TEXT NOT NULL DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS filaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    material TEXT NOT NULL,
    brand TEXT,
    stock_grams INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS print_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    customer_name TEXT,
    file_name TEXT,
    delivery_date TEXT,
    estimated_time_minutes INTEGER,
    estimated_filament_grams INTEGER,
    priority TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'pending',
    printer_id INTEGER,
    filament_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    finished_at DATETIME,

    FOREIGN KEY (printer_id) REFERENCES printers(id),
    FOREIGN KEY (filament_id) REFERENCES filaments(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    delivery_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    notes TEXT,
    priority TEXT NOT NULL DEFAULT 'normal',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    filament_id INTEGER,
    estimated_time_minutes INTEGER,
    estimated_filament_grams INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (filament_id) REFERENCES filaments(id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT,
    filament_id INTEGER,
    quantity INTEGER NOT NULL DEFAULT 1,
    estimated_time_minutes INTEGER,
    estimated_filament_grams INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (filament_id) REFERENCES filaments(id)
  );
`);

const printJobColumns = db.prepare("PRAGMA table_info(print_jobs)").all();
const hasProductId = printJobColumns.some(
  (column) => column.name === "product_id",
);
const hasDeliveryDate = printJobColumns.some(
  (column) => column.name === "delivery_date",
);
const hasOrderId = printJobColumns.some((column) => column.name === "order_id");
const hasOrderItemId = printJobColumns.some(
  (column) => column.name === "order_item_id",
);
const hasUnitIndex = printJobColumns.some(
  (column) => column.name === "unit_index",
);
const hasFailureReason = printJobColumns.some(
  (column) => column.name === "failure_reason",
);
const hasProgress = printJobColumns.some(
  (column) => column.name === "progress",
);

if (!hasProductId) {
  db.exec(`
    ALTER TABLE print_jobs
    ADD COLUMN product_id INTEGER REFERENCES products(id);
  `);
}

if (!hasDeliveryDate) {
  db.exec(`
    ALTER TABLE print_jobs
    ADD COLUMN delivery_date TEXT;
  `);
}

if (!hasOrderId) {
  db.exec(`
    ALTER TABLE print_jobs
    ADD COLUMN order_id INTEGER REFERENCES orders(id);
  `);
}

if (!hasOrderItemId) {
  db.exec(`
    ALTER TABLE print_jobs
    ADD COLUMN order_item_id INTEGER REFERENCES order_items(id);
  `);
}

if (!hasUnitIndex) {
  db.exec(`
    ALTER TABLE print_jobs
    ADD COLUMN unit_index INTEGER;
  `);
}

if (!hasFailureReason) {
  db.exec(`
    ALTER TABLE print_jobs
    ADD COLUMN failure_reason TEXT;
  `);
}

if (!hasProgress) {
  db.exec(`
    ALTER TABLE print_jobs
    ADD COLUMN progress INTEGER NOT NULL DEFAULT 0;
  `);
}

const productColumns = db.prepare("PRAGMA table_info(products)").all();
const hasProductEstimatedFilament = productColumns.some(
  (column) => column.name === "estimated_filament_grams",
);
const hasProductEstimatedTime = productColumns.some(
  (column) => column.name === "estimated_time_minutes",
);

if (!hasProductEstimatedTime) {
  db.exec(`
    ALTER TABLE products
    ADD COLUMN estimated_time_minutes INTEGER;
  `);
}

if (!hasProductEstimatedFilament) {
  db.exec(`
    ALTER TABLE products
    ADD COLUMN estimated_filament_grams INTEGER;
  `);
}

db.exec(`
  UPDATE print_jobs
  SET status = 'printing'
  WHERE status = 'paused';

  UPDATE print_jobs
  SET status = 'waiting_printer'
  WHERE status IN ('pending', 'cancelled');

  UPDATE print_jobs
  SET status = 'printed'
  WHERE status IN ('packing', 'completed');

  UPDATE orders
  SET status = 'ready_to_pack'
  WHERE status IN ('awaiting_packaging', 'printed');

  UPDATE printers
  SET status = 'available'
  WHERE status = 'printing'
    AND id NOT IN (
      SELECT printer_id
      FROM print_jobs
      WHERE status = 'printing'
        AND printer_id IS NOT NULL
    );
`);

console.log("Banco de dados inicializado.");
