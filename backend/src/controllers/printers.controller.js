const {
  validateCreatePrinter,
  validateUpdatePrinter,
  validateUpdatePrinterStatus,
} = require("../validations/printers.validation");

const db = require("../database/db");

function listPrinters(req, res) {
  const { status, search } = req.query;

  const conditions = [];
  const params = [];

  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }

  if (search) {
    conditions.push("(name LIKE ? OR model LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  let query = `
    SELECT *
    FROM printers
  `;

  if (conditions.length > 0) {
    query += `
      WHERE ${conditions.join(" AND ")}
    `;
  }

  query += `
    ORDER BY created_at DESC
  `;

  const printers = db.prepare(query).all(...params);

  res.json(printers);
}

function getPrinterById(req, res) {
  const { id } = req.params;

  const printer = db
    .prepare(
      `
    SELECT *
    FROM printers
    WHERE id = ?
  `,
    )
    .get(id);

  if (!printer) {
    return res.status(404).json({
      error: "Impressora não encontrada.",
    });
  }

  res.json(printer);
}

function createPrinter(req, res) {
  const errors = validateCreatePrinter(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Dados inválidos.",
      details: errors,
    });
  }

  const { name, model, status } = req.body;

  const result = db
    .prepare(
      `
    INSERT INTO printers (name, model, status)
    VALUES (?, ?, ?)
  `,
    )
    .run(name.trim(), model || null, status || "available");

  res.status(201).json({
    id: result.lastInsertRowid,
    name: name.trim(),
    model: model || null,
    status: status || "available",
  });
}

function updatePrinter(req, res) {
  const errors = validateUpdatePrinter(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Dados inválidos.",
      details: errors,
    });
  }

  const { id } = req.params;
  const { name, model, status } = req.body;

  const printer = findPrinter(id);

  if (!printer) {
    return res.status(404).json({
      error: "Impressora não encontrada.",
    });
  }

  const activeJob = findActiveJobByPrinter(id);

  if (activeJob && status !== "printing") {
    return res.status(400).json({
      error:
        "Não é possível alterar uma impressora em impressão para outro status.",
    });
  }

  db.prepare(
    `
    UPDATE printers
    SET
      name = ?,
      model = ?,
      status = ?
    WHERE id = ?
  `,
  ).run(name.trim(), model || null, status || "available", id);

  res.json({
    id: Number(id),
    name: name.trim(),
    model: model || null,
    status: status || "available",
  });
}

function updatePrinterStatus(req, res) {
  const errors = validateUpdatePrinterStatus(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Dados inválidos.",
      details: errors,
    });
  }

  const { id } = req.params;
  const { status } = req.body;

  const printer = findPrinter(id);

  if (!printer) {
    return res.status(404).json({
      error: "Impressora não encontrada.",
    });
  }

  const activeJob = findActiveJobByPrinter(id);

  if (activeJob && status !== "printing") {
    return res.status(400).json({
      error:
        "Não é possível liberar uma impressora que possui impressão ativa.",
    });
  }

  db.prepare(
    `
    UPDATE printers
    SET status = ?
    WHERE id = ?
  `,
  ).run(status, id);

  res.json({
    message: "Status da impressora atualizado com sucesso.",
  });
}

function deletePrinter(req, res) {
  const { id } = req.params;

  const printer = findPrinter(id);

  if (!printer) {
    return res.status(404).json({
      error: "Impressora não encontrada.",
    });
  }

  const linkedJobs = db
    .prepare(
      `
    SELECT COUNT(*) AS total
    FROM print_jobs
    WHERE printer_id = ?
  `,
    )
    .get(id);

  if (linkedJobs.total > 0) {
    return res.status(400).json({
      error:
        "Não é possível remover uma impressora vinculada a trabalhos de impressão.",
    });
  }

  db.prepare(
    `
    DELETE FROM printers
    WHERE id = ?
  `,
  ).run(id);

  res.json({
    message: "Impressora removida com sucesso.",
  });
}

function findPrinter(id) {
  return db
    .prepare(
      `
    SELECT *
    FROM printers
    WHERE id = ?
  `,
    )
    .get(id);
}

function findActiveJobByPrinter(printerId) {
  return db
    .prepare(
      `
    SELECT id
    FROM print_jobs
    WHERE printer_id = ?
      AND status = 'printing'
    LIMIT 1
  `,
    )
    .get(printerId);
}

module.exports = {
  listPrinters,
  getPrinterById,
  createPrinter,
  updatePrinter,
  updatePrinterStatus,
  deletePrinter,
};
