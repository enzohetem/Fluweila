const {
  validateCreateJob,
  validateUpdateJob,
  validateUpdateJobStatus,
} = require("../validations/jobs.validation");

const { FINAL_JOB_STATUSES } = require("../validations/constants");
const {
  updateJobStatus: updateJobStatusService,
} = require("../services/jobs.service");
const {
  validateFilamentStockAvailability,
  reserveFilamentStock,
  releaseFilamentStock,
} = require("../services/filamentStock.service");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { calculateJobPriority } = require("../utils/jobPriority");

const db = require("../database/db");

function listJobs(req, res) {
  syncJobPriorities();

  const { page, limit, offset } = getPagination(req.query);
  const { conditions, params } = buildJobFilters(req.query);
  conditions.unshift("print_jobs.status != 'printed'");

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = db
    .prepare(
      `
    SELECT COUNT(*) AS total
    FROM print_jobs
    LEFT JOIN printers ON printers.id = print_jobs.printer_id
    LEFT JOIN filaments ON filaments.id = print_jobs.filament_id
    LEFT JOIN products ON products.id = print_jobs.product_id
    ${whereClause}
  `,
    )
    .get(...params);

  const jobs = db
    .prepare(
      `
    ${baseJobSelect()}
    ${whereClause}
    ${queueOrderBy()}
    LIMIT ?
    OFFSET ?
  `,
    )
    .all(...params, limit, offset);

  res.json({
    data: jobs,
    pagination: buildPaginationMeta({
      page,
      limit,
      total: total.total,
    }),
  });
}

function listJobHistory(req, res) {
  syncJobPriorities();

  const { page, limit, offset } = getPagination(req.query);
  const { conditions, params } = buildJobFilters(req.query);

  conditions.unshift(`
    print_jobs.status = 'printed'
  `);

  if (req.query.start_date) {
    conditions.push("DATE(print_jobs.finished_at) >= DATE(?)");
    params.push(req.query.start_date);
  }

  if (req.query.end_date) {
    conditions.push("DATE(print_jobs.finished_at) <= DATE(?)");
    params.push(req.query.end_date);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const total = db
    .prepare(
      `
    SELECT COUNT(*) AS total
    FROM print_jobs
    LEFT JOIN printers ON printers.id = print_jobs.printer_id
    LEFT JOIN filaments ON filaments.id = print_jobs.filament_id
    LEFT JOIN products ON products.id = print_jobs.product_id
    ${whereClause}
  `,
    )
    .get(...params);

  const history = db
    .prepare(
      `
    ${baseJobSelect()}
    ${whereClause}
    ORDER BY print_jobs.finished_at DESC
    LIMIT ?
    OFFSET ?
  `,
    )
    .all(...params, limit, offset);

  res.json({
    data: history,
    pagination: buildPaginationMeta({
      page,
      limit,
      total: total.total,
    }),
  });
}

function getJobById(req, res) {
  syncJobPriorities();

  const { id } = req.params;

  const job = findJobWithRelations(id);

  if (!job) {
    return res.status(404).json({
      error: "Trabalho de impressão não encontrado.",
    });
  }

  res.json(job);
}

function createJob(req, res) {
  const errors = validateCreateJob(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Dados inválidos.",
      details: errors,
    });
  }

  const {
    title,
    description,
    customer_name,
    file_name,
    delivery_date,
    estimated_time_minutes,
    estimated_filament_grams,
    printer_id,
    filament_id,
    product_id,
  } = req.body;

  const jobTitle = normalizeJobTitle(title, customer_name);
  const referenceError = validateJobReferences({
    printer_id,
    filament_id,
    product_id,
  });

  if (referenceError) {
    return res.status(referenceError.status).json({
      error: referenceError.message,
    });
  }

  const stockError = validateFilamentStockAvailability([
    {
      filament_id,
      estimated_filament_grams,
    },
  ]);

  if (stockError) {
    return res.status(stockError.status).json({
      error: stockError.message,
    });
  }

  const transaction = db.transaction(() => {
    reserveFilamentStock([
      {
        filament_id,
        estimated_filament_grams,
      },
    ]);

    const result = db
      .prepare(
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
        printer_id,
        filament_id,
        product_id,
        stock_reserved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
      )
      .run(
        jobTitle,
        description || null,
        customer_name || null,
        file_name || null,
        delivery_date,
        toNullableNumber(estimated_time_minutes),
        toNullableNumber(estimated_filament_grams),
        calculateJobPriority(delivery_date),
        "waiting_printer",
        toNullableNumber(printer_id),
        toNullableNumber(filament_id),
        toNullableNumber(product_id),
      );

    return result.lastInsertRowid;
  });

  const jobId = transaction();

  res.status(201).json(findJobWithRelations(jobId));
}

function updateJob(req, res) {
  const errors = validateUpdateJob(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Dados inválidos.",
      details: errors,
    });
  }

  const { id } = req.params;
  const {
    title,
    description,
    customer_name,
    file_name,
    delivery_date,
    estimated_time_minutes,
    estimated_filament_grams,
    printer_id,
    filament_id,
    product_id,
  } = req.body;

  const job = findJob(id);

  if (!job) {
    return res.status(404).json({
      error: "Trabalho de impressão não encontrado.",
    });
  }

  if (FINAL_JOB_STATUSES.includes(job.status)) {
    return res.status(400).json({
      error: "Este trabalho já foi finalizado e não pode ser alterado.",
    });
  }

  if (
    job.status === "printing" &&
    toNullableNumber(printer_id) !== job.printer_id
  ) {
    return res.status(400).json({
      error: "Não é possível trocar a impressora de um trabalho em impressão.",
    });
  }

  const jobTitle = normalizeJobTitle(title, customer_name);
  const referenceError = validateJobReferences({
    printer_id,
    filament_id,
    product_id,
  });

  if (referenceError) {
    return res.status(referenceError.status).json({
      error: referenceError.message,
    });
  }

  const stockError = validateFilamentStockAvailability(
    [
      {
        filament_id,
        estimated_filament_grams,
      },
    ],
    {
      creditRequirements: job.stock_reserved_at
        ? [
            {
              filament_id: job.filament_id,
              estimated_filament_grams: job.estimated_filament_grams,
            },
          ]
        : [],
    },
  );

  if (stockError) {
    return res.status(stockError.status).json({
      error: stockError.message,
    });
  }

  const transaction = db.transaction(() => {
    if (job.stock_reserved_at) {
      releaseFilamentStock([
        {
          filament_id: job.filament_id,
          estimated_filament_grams: job.estimated_filament_grams,
        },
      ]);
    }

    reserveFilamentStock([
      {
        filament_id,
        estimated_filament_grams,
      },
    ]);

    db.prepare(
      `
      UPDATE print_jobs
      SET
        title = ?,
        description = ?,
        customer_name = ?,
        file_name = ?,
        delivery_date = ?,
        estimated_time_minutes = ?,
        estimated_filament_grams = ?,
        priority = ?,
        printer_id = ?,
        filament_id = ?,
        product_id = ?,
        stock_reserved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(
      jobTitle,
      description || null,
      customer_name || null,
      file_name || null,
      delivery_date,
      toNullableNumber(estimated_time_minutes),
      toNullableNumber(estimated_filament_grams),
      calculateJobPriority(delivery_date),
      toNullableNumber(printer_id),
      toNullableNumber(filament_id),
      toNullableNumber(product_id),
      id,
    );
  });

  transaction();

  res.json(findJobWithRelations(id));
}

function updateJobStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const errors = validateUpdateJobStatus(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Dados inválidos.",
      details: errors,
    });
  }

  try {
    const result = updateJobStatusService(id, status);
    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Erro interno do servidor.",
    });
  }
}

function deleteJob(req, res) {
  const { id } = req.params;

  const job = findJob(id);

  if (!job) {
    return res.status(404).json({
      error: "Trabalho de impressão não encontrado.",
    });
  }

  if (job.status === "printing") {
    return res.status(400).json({
      error: "Não é possível remover um trabalho em impressão.",
    });
  }

  const transaction = db.transaction(() => {
    if (job.status !== "printed" && job.stock_reserved_at) {
      releaseFilamentStock([
        {
          filament_id: job.filament_id,
          estimated_filament_grams: job.estimated_filament_grams,
        },
      ]);
    }

    db.prepare(
      `
      DELETE FROM print_jobs
      WHERE id = ?
    `,
    ).run(id);
  });

  transaction();

  res.json({
    message: "Trabalho de impressão removido com sucesso.",
  });
}

function buildJobFilters(query) {
  const {
    status,
    priority,
    printer_id,
    filament_id,
    product_id,
    customer_name,
    search,
  } = query;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push("print_jobs.status = ?");
    params.push(status);
  }

  if (priority) {
    conditions.push("print_jobs.priority = ?");
    params.push(priority);
  }

  if (printer_id) {
    conditions.push("print_jobs.printer_id = ?");
    params.push(Number(printer_id));
  }

  if (filament_id) {
    conditions.push("print_jobs.filament_id = ?");
    params.push(Number(filament_id));
  }

  if (product_id) {
    conditions.push("print_jobs.product_id = ?");
    params.push(Number(product_id));
  }

  if (customer_name) {
    conditions.push("print_jobs.customer_name LIKE ?");
    params.push(`%${customer_name}%`);
  }

  if (search) {
    conditions.push(`
      (
        print_jobs.title LIKE ?
        OR print_jobs.description LIKE ?
        OR print_jobs.customer_name LIKE ?
        OR print_jobs.file_name LIKE ?
        OR products.name LIKE ?
        OR products.sku LIKE ?
        OR printers.name LIKE ?
        OR filaments.name LIKE ?
        OR filaments.color LIKE ?
        OR CAST(print_jobs.order_id AS TEXT) LIKE ?
      )
    `);

    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
    );
  }

  return {
    conditions,
    params,
  };
}

function baseJobSelect() {
  return `
    SELECT
      print_jobs.*,

      printers.name AS printer_name,
      printers.model AS printer_model,
      printers.status AS printer_status,

      filaments.name AS filament_name,
      filaments.color AS filament_color,
      filaments.material AS filament_material,
      filaments.brand AS filament_brand,

      products.name AS product_name,
      products.sku AS product_sku,
      products.quantity AS product_quantity,
      products.estimated_time_minutes AS product_estimated_time_minutes,
      products.estimated_filament_grams AS product_estimated_filament_grams,
      products.filament_id AS product_filament_id,

      orders.id AS order_number,
      orders.status AS order_status

    FROM print_jobs
    LEFT JOIN printers ON printers.id = print_jobs.printer_id
    LEFT JOIN filaments ON filaments.id = print_jobs.filament_id
    LEFT JOIN products ON products.id = print_jobs.product_id
    LEFT JOIN orders ON orders.id = print_jobs.order_id
  `;
}

function queueOrderBy() {
  return `
    ORDER BY
      CASE print_jobs.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
        ELSE 5
      END,
      CASE print_jobs.status
        WHEN 'waiting_printer' THEN 1
        WHEN 'reprint' THEN 2
        WHEN 'allocated' THEN 3
        WHEN 'printing' THEN 4
        WHEN 'failed' THEN 5
        WHEN 'printed' THEN 6
        ELSE 7
      END,
      print_jobs.created_at ASC
  `;
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

  const update = db.prepare(`
    UPDATE print_jobs
    SET priority = ?
    WHERE id = ?
  `);

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

function findJob(id) {
  return db
    .prepare(
      `
    SELECT *
    FROM print_jobs
    WHERE id = ?
  `,
    )
    .get(id);
}

function findJobWithRelations(id) {
  return db
    .prepare(
      `
    ${baseJobSelect()}
    WHERE print_jobs.id = ?
  `,
    )
    .get(id);
}

function validateJobReferences({ printer_id, filament_id, product_id }) {
  if (printer_id) {
    const printer = db
      .prepare(
        `
      SELECT id
      FROM printers
      WHERE id = ?
    `,
      )
      .get(printer_id);

    if (!printer) {
      return {
        status: 404,
        message: "Impressora informada não existe.",
      };
    }
  }

  if (filament_id) {
    const filament = db
      .prepare(
        `
      SELECT id
      FROM filaments
      WHERE id = ?
    `,
      )
      .get(filament_id);

    if (!filament) {
      return {
        status: 404,
        message: "Filamento informado não existe.",
      };
    }
  }

  if (product_id) {
    const product = db
      .prepare(
        `
      SELECT id
      FROM products
      WHERE id = ?
    `,
      )
      .get(product_id);

    if (!product) {
      return {
        status: 404,
        message: "Produto informado não existe.",
      };
    }
  }

  return null;
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return Number(value);
}

function normalizeJobTitle(title, customerName) {
  if (title && title.trim() !== "") {
    return title.trim();
  }

  return customerName.trim();
}

module.exports = {
  listJobs,
  listJobHistory,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
};
