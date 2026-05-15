const db = require("../database/db");

const {
  validateCreateFilament,
  validateUpdateFilament,
  validateUpdateFilamentStock,
} = require("../validations/filaments.validation");

function listFilaments(req, res) {
  const { material, color, brand, low_stock, search } = req.query;

  const conditions = [];
  const params = [];

  if (material) {
    conditions.push("material = ?");
    params.push(material);
  }

  if (color) {
    conditions.push("color LIKE ?");
    params.push(`%${color}%`);
  }

  if (brand) {
    conditions.push("brand LIKE ?");
    params.push(`%${brand}%`);
  }

  if (low_stock === "true") {
    conditions.push("stock_grams <= ?");
    params.push(200);
  }

  if (search) {
    conditions.push(`
      (
        name LIKE ?
        OR color LIKE ?
        OR material LIKE ?
        OR brand LIKE ?
      )
    `);

    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  let query = `
    SELECT *
    FROM filaments
  `;

  if (conditions.length > 0) {
    query += `
      WHERE ${conditions.join(" AND ")}
    `;
  }

  query += `
    ORDER BY created_at DESC
  `;

  const filaments = db.prepare(query).all(...params);

  res.json(filaments);
}

function getFilamentById(req, res) {
  const { id } = req.params;

  const filament = findFilament(id);

  if (!filament) {
    return res.status(404).json({
      error: "Filamento não encontrado.",
    });
  }

  res.json(filament);
}

function createFilament(req, res) {
  const errors = validateCreateFilament(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Dados inválidos.",
      details: errors,
    });
  }

  const { name, color, material, brand, stock_grams } = req.body;
  const filamentName = buildFilamentName({ name, brand, material, color });

  const result = db
    .prepare(
      `
      INSERT INTO filaments (
        name,
        color,
        material,
        brand,
        stock_grams
      ) VALUES (?, ?, ?, ?, ?)
    `,
    )
    .run(
      filamentName,
      color.trim(),
      material,
      brand || null,
      Number(stock_grams) || 0,
    );

  res.status(201).json({
    id: result.lastInsertRowid,
    name: filamentName,
    color: color.trim(),
    material,
    brand: brand || null,
    stock_grams: Number(stock_grams) || 0,
  });
}

function updateFilament(req, res) {
  const errors = validateUpdateFilament(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Dados inválidos.",
      details: errors,
    });
  }

  const { id } = req.params;
  const { name, color, material, brand, stock_grams } = req.body;
  const filamentName = buildFilamentName({ name, brand, material, color });

  const filament = findFilament(id);

  if (!filament) {
    return res.status(404).json({
      error: "Filamento não encontrado.",
    });
  }

  db.prepare(
    `
    UPDATE filaments
    SET
      name = ?,
      color = ?,
      material = ?,
      brand = ?,
      stock_grams = ?
    WHERE id = ?
  `,
  ).run(
    filamentName,
    color.trim(),
    material,
    brand || null,
    Number(stock_grams) || 0,
    id,
  );

  res.json({
    id: Number(id),
    name: filamentName,
    color: color.trim(),
    material,
    brand: brand || null,
    stock_grams: Number(stock_grams) || 0,
  });
}

function updateFilamentStock(req, res) {
  const errors = validateUpdateFilamentStock(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Dados inválidos.",
      details: errors,
    });
  }

  const { id } = req.params;
  const { stock_grams } = req.body;

  const filament = findFilament(id);

  if (!filament) {
    return res.status(404).json({
      error: "Filamento não encontrado.",
    });
  }

  db.prepare(
    `
    UPDATE filaments
    SET stock_grams = ?
    WHERE id = ?
  `,
  ).run(Number(stock_grams), id);

  res.json({
    message: "Estoque do filamento atualizado com sucesso.",
  });
}

function deleteFilament(req, res) {
  const { id } = req.params;

  const filament = findFilament(id);

  if (!filament) {
    return res.status(404).json({
      error: "Filamento não encontrado.",
    });
  }

  const linkedJobs = db
    .prepare(
      `
    SELECT COUNT(*) AS total
    FROM print_jobs
    WHERE filament_id = ?
  `,
    )
    .get(id);

  if (linkedJobs.total > 0) {
    return res.status(400).json({
      error: "Não é possível remover um filamento vinculado a trabalhos de impressão.",
    });
  }

  db.prepare(
    `
    DELETE FROM filaments
    WHERE id = ?
  `,
  ).run(id);

  res.json({
    message: "Filamento removido com sucesso.",
  });
}

function findFilament(id) {
  return db
    .prepare(
      `
      SELECT *
      FROM filaments
      WHERE id = ?
    `,
    )
    .get(id);
}

function buildFilamentName({ name, brand, material, color }) {
  if (name && name.trim() !== "") {
    return name.trim();
  }

  return [brand, material, color]
    .filter((value) => value && String(value).trim() !== "")
    .map((value) => String(value).trim())
    .join(" ");
}

module.exports = {
  listFilaments,
  getFilamentById,
  createFilament,
  updateFilament,
  updateFilamentStock,
  deleteFilament,
};
