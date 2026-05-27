const db = require("../database/db");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { calculateJobPriority } = require("../utils/jobPriority");
const {
  validateCreateOrder,
  validateUpdateOrder,
  validateUpdateOrderStatus,
} = require("../validations/orders.validation");
const {
  validateFilamentStockAvailability,
  reserveFilamentStock,
  releaseFilamentStock,
} = require("../services/filamentStock.service");

function listOrders(req, res) {
  syncOrderStatuses();

  const { page, limit, offset } = getPagination(req.query);
  const { conditions, params } = buildOrderFilters(req.query);
  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = db
    .prepare(
      `
    SELECT COUNT(*) AS total
    FROM orders
    ${whereClause}
  `,
    )
    .get(...params);

  const orders = db
    .prepare(
      `
    ${baseOrderSelect()}
    ${whereClause}
    GROUP BY orders.id
    ${orderOrderBy()}
    LIMIT ?
    OFFSET ?
  `,
    )
    .all(...params, limit, offset);

  res.json({
    data: orders,
    pagination: buildPaginationMeta({ page, limit, total: total.total }),
  });
}

function getOrderById(req, res) {
  syncOrderStatuses();

  const order = findOrderWithSummary(req.params.id);

  if (!order) {
    return res.status(404).json({ error: "Pedido nao encontrado." });
  }

  res.json({
    ...order,
    items: findOrderItems(order.id),
    jobs: findOrderJobs(order.id),
  });
}

function createOrder(req, res) {
  const errors = validateCreateOrder(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Dados invalidos.",
      details: errors,
    });
  }

  const { customer_name, delivery_date, notes, items } = req.body;
  const priority = calculateJobPriority(delivery_date);
  const products = loadProductsForItems(items);

  if (products.error) {
    return res.status(products.error.status).json({ error: products.error.message });
  }

  const filamentRequirements = items.map((item) => {
    const product = products.byId.get(Number(item.product_id));

    return {
      filament_id: product.filament_id,
      estimated_filament_grams: product.estimated_filament_grams,
      quantity: item.quantity,
    };
  });

  const stockError = validateFilamentStockAvailability(filamentRequirements);

  if (stockError) {
    return res.status(stockError.status).json({ error: stockError.message });
  }

  const transaction = db.transaction(() => {
    reserveFilamentStock(filamentRequirements);

    const orderResult = db
      .prepare(
        `
      INSERT INTO orders (
        customer_name,
        delivery_date,
        status,
        notes,
        priority
      ) VALUES (?, ?, 'new', ?, ?)
    `,
      )
      .run(customer_name.trim(), delivery_date, notes || null, priority);

    const orderId = orderResult.lastInsertRowid;

    items.forEach((item) => {
      const product = products.byId.get(Number(item.product_id));
      const quantity = Number(item.quantity);
      const filamentId = product.filament_id || null;
      const estimatedTime = product.estimated_time_minutes || null;
      const estimatedFilament = product.estimated_filament_grams || null;

      const itemResult = db
        .prepare(
          `
        INSERT INTO order_items (
          order_id,
          product_id,
          quantity,
          filament_id,
          estimated_time_minutes,
          estimated_filament_grams,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          orderId,
          product.id,
          quantity,
          filamentId,
          estimatedTime,
          estimatedFilament,
          item.notes || null,
        );

      for (let unitIndex = 1; unitIndex <= quantity; unitIndex += 1) {
        db.prepare(
          `
          INSERT INTO print_jobs (
            title,
            description,
            customer_name,
            file_name,
            delivery_date,
            estimated_time_minutes,
            estimated_filament_grams,
            priority,
            status,
            filament_id,
            product_id,
            order_id,
            order_item_id,
            unit_index,
            stock_reserved_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'waiting_printer', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        ).run(
          `Pedido #${orderId} - ${product.name} ${unitIndex}/${quantity}`,
          notes || null,
          customer_name.trim(),
          product.name,
          delivery_date,
          estimatedTime,
          estimatedFilament,
          priority,
          filamentId,
          product.id,
          orderId,
          itemResult.lastInsertRowid,
          unitIndex,
        );
      }
    });

    return orderId;
  });

  const orderId = transaction();
  res.status(201).json({
    ...findOrderWithSummary(orderId),
    items: findOrderItems(orderId),
    jobs: findOrderJobs(orderId),
  });
}

function updateOrder(req, res) {
  const errors = validateUpdateOrder(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Dados invalidos.",
      details: errors,
    });
  }

  const order = findOrder(req.params.id);

  if (!order) {
    return res.status(404).json({ error: "Pedido nao encontrado." });
  }

  const customerName = req.body.customer_name.trim();
  const deliveryDate = req.body.delivery_date;
  const notes = req.body.notes || null;
  const priority = calculateJobPriority(deliveryDate);

  const transaction = db.transaction(() => {
    db.prepare(
      `
      UPDATE orders
      SET customer_name = ?,
          delivery_date = ?,
          notes = ?,
          priority = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(customerName, deliveryDate, notes, priority, req.params.id);

    db.prepare(
      `
      UPDATE print_jobs
      SET customer_name = ?,
          delivery_date = ?,
          description = ?,
          priority = ?
      WHERE order_id = ?
    `,
    ).run(customerName, deliveryDate, notes, priority, req.params.id);
  });

  transaction();

  res.json({
    ...findOrderWithSummary(req.params.id),
    items: findOrderItems(req.params.id),
    jobs: findOrderJobs(req.params.id),
  });
}

function updateOrderStatus(req, res) {
  const errors = validateUpdateOrderStatus(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Dados invalidos.",
      details: errors,
    });
  }

  const order = findOrder(req.params.id);

  if (!order) {
    return res.status(404).json({ error: "Pedido nao encontrado." });
  }

  const transitionError = validateOrderStatusTransition(order, req.body.status);

  if (transitionError) {
    return res.status(400).json({ error: transitionError });
  }

  db.prepare(
    `
    UPDATE orders
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,
  ).run(req.body.status, req.params.id);

  res.json(findOrderWithSummary(req.params.id));
}

function validateOrderStatusTransition(order, nextStatus) {
  if (nextStatus === order.status) {
    return null;
  }

  if (nextStatus === "packed" && !["ready_to_pack", "printed"].includes(order.status)) {
    return "O pedido so pode ser embalado depois de ficar pronto para embalar.";
  }

  if (nextStatus === "completed" && order.status !== "packed") {
    return "O pedido so pode ser finalizado depois de ser embalado.";
  }

  if (
    ["ready_to_pack", "packed", "completed"].includes(nextStatus) &&
    !["ready_to_pack", "printed", "packed"].includes(order.status)
  ) {
    return "Este status ainda esta bloqueado para este pedido.";
  }

  return null;
}

function deleteOrder(req, res) {
  const order = findOrder(req.params.id);

  if (!order) {
    return res.status(404).json({ error: "Pedido nao encontrado." });
  }

  const activePrinting = db
    .prepare(
      `
    SELECT id
    FROM print_jobs
    WHERE order_id = ?
      AND status = 'printing'
    LIMIT 1
  `,
    )
    .get(req.params.id);

  if (activePrinting) {
    return res.status(400).json({
      error: "Nao e possivel remover um pedido com impressao em andamento.",
    });
  }

  const transaction = db.transaction(() => {
    releaseFilamentStock(getReturnableJobFilamentRequirements(req.params.id));

    db.prepare("DELETE FROM print_jobs WHERE order_id = ?").run(req.params.id);
    db.prepare("DELETE FROM order_items WHERE order_id = ?").run(req.params.id);
    db.prepare("DELETE FROM orders WHERE id = ?").run(req.params.id);
  });

  transaction();

  res.json({ message: "Pedido removido com sucesso." });
}

function getReturnableJobFilamentRequirements(orderId) {
  return db
    .prepare(
      `
      SELECT filament_id, estimated_filament_grams
      FROM print_jobs
      WHERE order_id = ?
        AND status != 'printed'
        AND stock_reserved_at IS NOT NULL
    `,
    )
    .all(orderId);
}

function buildOrderFilters(query) {
  const { status, search, due_today } = query;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push("orders.status = ?");
    params.push(status);
  }

  if (due_today === "true") {
    conditions.push("DATE(orders.delivery_date) = DATE('now', 'localtime')");
  }

  if (search) {
    conditions.push(`
      (
        orders.customer_name LIKE ?
        OR orders.notes LIKE ?
        OR CAST(orders.id AS TEXT) LIKE ?
      )
    `);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  return { conditions, params };
}

function baseOrderSelect() {
  return `
    SELECT
      orders.*,
      COUNT(print_jobs.id) AS total_jobs,
      SUM(CASE WHEN print_jobs.status = 'printed' THEN 1 ELSE 0 END) AS printed_jobs,
      SUM(CASE WHEN print_jobs.status = 'printing' THEN 1 ELSE 0 END) AS printing_jobs,
      SUM(CASE WHEN print_jobs.status = 'allocated' THEN 1 ELSE 0 END) AS allocated_jobs,
      SUM(CASE WHEN print_jobs.status IN ('waiting_printer', 'reprint') THEN 1 ELSE 0 END) AS open_jobs,
      SUM(CASE WHEN print_jobs.status = 'failed' THEN 1 ELSE 0 END) AS failed_jobs
    FROM orders
    LEFT JOIN print_jobs ON print_jobs.order_id = orders.id
  `;
}

function orderOrderBy() {
  return `
    ORDER BY
      DATETIME(orders.created_at) DESC,
      orders.id DESC
  `;
}

function findOrder(id) {
  return db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
}

function findOrderWithSummary(id) {
  return db
    .prepare(
      `
    ${baseOrderSelect()}
    WHERE orders.id = ?
    GROUP BY orders.id
  `,
    )
    .get(id);
}

function findOrderItems(orderId) {
  return db
    .prepare(
      `
    SELECT
      order_items.*,
      products.name AS product_name,
      products.sku AS product_sku,
      filaments.name AS filament_name,
      filaments.color AS filament_color,
      filaments.material AS filament_material,
      filaments.brand AS filament_brand
    FROM order_items
    LEFT JOIN products ON products.id = order_items.product_id
    LEFT JOIN filaments ON filaments.id = order_items.filament_id
    WHERE order_items.order_id = ?
    ORDER BY order_items.id ASC
  `,
    )
    .all(orderId);
}

function findOrderJobs(orderId) {
  return db
    .prepare(
      `
    SELECT
      print_jobs.*,
      products.name AS product_name,
      products.sku AS product_sku,
      printers.name AS printer_name,
      filaments.color AS filament_color,
      filaments.material AS filament_material,
      filaments.brand AS filament_brand
    FROM print_jobs
    LEFT JOIN products ON products.id = print_jobs.product_id
    LEFT JOIN printers ON printers.id = print_jobs.printer_id
    LEFT JOIN filaments ON filaments.id = print_jobs.filament_id
    WHERE print_jobs.order_id = ?
    ORDER BY print_jobs.id ASC
  `,
    )
    .all(orderId);
}

function loadProductsForItems(items) {
  const byId = new Map();

  for (const item of items) {
    const productId = Number(item.product_id);

    if (byId.has(productId)) {
      continue;
    }

    const product = db
      .prepare(
        `
      SELECT *
      FROM products
      WHERE id = ?
    `,
      )
      .get(productId);

    if (!product) {
      return {
        error: {
          status: 404,
          message: `Produto ${productId} nao encontrado.`,
        },
      };
    }

    byId.set(productId, product);
  }

  return { byId };
}

function syncOrderStatuses() {
  completePackedOrdersAfterCutoff();

  const orders = db.prepare("SELECT id, status FROM orders").all();

  const summary = db.prepare(
    `
    SELECT
      COUNT(*) AS total_jobs,
      SUM(CASE WHEN status = 'printed' THEN 1 ELSE 0 END) AS printed_jobs,
      SUM(CASE WHEN status = 'printing' THEN 1 ELSE 0 END) AS printing_jobs,
      SUM(CASE WHEN status = 'allocated' THEN 1 ELSE 0 END) AS allocated_jobs,
      SUM(CASE WHEN status IN ('waiting_printer', 'reprint') THEN 1 ELSE 0 END) AS open_jobs,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_jobs
    FROM print_jobs
    WHERE order_id = ?
  `,
  );
  const update = db.prepare(
    "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  );

  const transaction = db.transaction(() => {
    orders.forEach((order) => {
      if (["cancelled", "ready_to_pack", "packed", "completed"].includes(order.status)) {
        return;
      }

      const data = summary.get(order.id);
      const total = data.total_jobs || 0;
      const printed = data.printed_jobs || 0;
      const printing = data.printing_jobs || 0;
      const allocated = data.allocated_jobs || 0;
      const open = data.open_jobs || 0;
      const failed = data.failed_jobs || 0;
      let nextStatus = "new";

      if (total > 0 && printed === total) {
        nextStatus = "ready_to_pack";
      } else if (printing > 0 || allocated > 0 || printed > 0 || failed > 0) {
        nextStatus = "in_production";
      }

      if (nextStatus !== order.status) {
        update.run(nextStatus, order.id);
      }
    });
  });

  transaction();
}

function completePackedOrdersAfterCutoff() {
  return db
    .prepare(
      `
      UPDATE orders
      SET status = 'completed',
          updated_at = CURRENT_TIMESTAMP
      WHERE status = 'packed'
        AND (
          TIME('now', 'localtime') >= '23:00:00'
          OR DATE(updated_at, 'localtime') < DATE('now', 'localtime')
        )
    `,
    )
    .run();
}

module.exports = {
  listOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  syncOrderStatuses,
  completePackedOrdersAfterCutoff,
};
