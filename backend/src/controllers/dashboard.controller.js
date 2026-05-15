const db = require("../database/db");
const { calculateJobPriority } = require("../utils/jobPriority");
const { syncOrderStatuses } = require("./orders.controller");

function getSummary(req, res) {
  syncJobPriorities();
  syncOrderPriorities();
  syncOrderStatuses();

  const printerCounts = countPrinters();
  const orderCounts = countOrders();
  const jobCounts = countJobs();
  const filamentCounts = countFilaments();
  const weeklyOrders = listWeeklyOrders();
  const lowStockItems = listLowStockItems();

  res.json({
    printers: printerCounts,
    orders: orderCounts,
    jobs: jobCounts,
    filaments: filamentCounts,
    weekly_orders: weeklyOrders,
    low_stock_items: lowStockItems,
  });
}

function countPrinters() {
  return {
    total: count("printers"),
    available: count("printers", "status = 'available'"),
    printing: count("printers", "status = 'printing'"),
    maintenance: count("printers", "status = 'maintenance'"),
    offline: count("printers", "status = 'offline'"),
  };
}

function countOrders() {
  return {
    total: count("orders"),
    new: count("orders", "status = 'new'"),
    in_production: count("orders", "status = 'in_production'"),
    ready_to_pack: count("orders", "status = 'ready_to_pack'"),
    packed: count("orders", "status = 'packed'"),
    completed: count("orders", "status = 'completed'"),
    cancelled: count("orders", "status = 'cancelled'"),
    active: count("orders", "status NOT IN ('completed', 'cancelled')"),
  };
}

function countJobs() {
  return {
    waiting_printer: count("print_jobs", "status = 'waiting_printer'"),
    allocated: count("print_jobs", "status = 'allocated'"),
    printing: count("print_jobs", "status = 'printing'"),
    printed: count("print_jobs", "status = 'printed'"),
    failed: count("print_jobs", "status = 'failed'"),
    reprint: count("print_jobs", "status = 'reprint'"),
  };
}

function countFilaments() {
  const totalStock = db
    .prepare("SELECT COALESCE(SUM(stock_grams), 0) AS total FROM filaments")
    .get();

  return {
    total: count("filaments"),
    low_stock: count("filaments", "stock_grams <= 200"),
    total_stock_grams: totalStock.total,
  };
}

function count(table, whereClause = "") {
  const result = db
    .prepare(
      `
    SELECT COUNT(*) AS total
    FROM ${table}
    ${whereClause ? `WHERE ${whereClause}` : ""}
  `,
    )
    .get();

  return result.total;
}

function listWeeklyOrders() {
  const rows = db
    .prepare(
      `
    SELECT
      DATE(delivery_date) AS day,
      COUNT(*) AS total
    FROM orders
    WHERE delivery_date IS NOT NULL
      AND DATE(delivery_date) >= DATE('now', 'localtime', '-6 days')
      AND DATE(delivery_date) <= DATE('now', 'localtime')
      AND status != 'cancelled'
    GROUP BY DATE(delivery_date)
  `,
    )
    .all();
  const totalsByDay = new Map(rows.map((row) => [row.day, row.total]));
  const days = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = toDateKey(date);

    days.push({
      date: key,
      label: date.toLocaleDateString("pt-BR", { weekday: "short" }),
      total: totalsByDay.get(key) || 0,
    });
  }

  return days;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function listLowStockItems() {
  return db
    .prepare(
      `
    SELECT id, name, color, material, brand, stock_grams
    FROM filaments
    WHERE stock_grams <= 200
    ORDER BY stock_grams ASC
    LIMIT 5
  `,
    )
    .all();
}

function syncJobPriorities() {
  const jobs = db
    .prepare(
      `
    SELECT id, delivery_date, priority
    FROM print_jobs
    WHERE status != 'printed'
      AND delivery_date IS NOT NULL
  `,
    )
    .all();

  const update = db.prepare("UPDATE print_jobs SET priority = ? WHERE id = ?");

  const transaction = db.transaction(() => {
    jobs.forEach((job) => {
      const priority = calculateJobPriority(job.delivery_date);

      if (priority !== job.priority) {
        update.run(priority, job.id);
      }
    });
  });

  transaction();
}

function syncOrderPriorities() {
  const orders = db
    .prepare(
      `
    SELECT id, delivery_date, priority
    FROM orders
    WHERE status NOT IN ('completed', 'cancelled')
      AND delivery_date IS NOT NULL
  `,
    )
    .all();

  const update = db.prepare("UPDATE orders SET priority = ? WHERE id = ?");

  const transaction = db.transaction(() => {
    orders.forEach((order) => {
      const priority = calculateJobPriority(order.delivery_date);

      if (priority !== order.priority) {
        update.run(priority, order.id);
      }
    });
  });

  transaction();
}

module.exports = {
  getSummary,
};
