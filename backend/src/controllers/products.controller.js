const db = require("../database/db");
const { validateProduct } = require("../validations/products.validation");

function listProducts(req, res) {
  const { search, filament_id } = req.query;
  const conditions = [];
  const params = [];

  if (filament_id) {
    conditions.push("products.filament_id = ?");
    params.push(Number(filament_id));
  }

  if (search) {
    conditions.push(`
      (
        products.name LIKE ?
        OR products.sku LIKE ?
        OR filaments.name LIKE ?
        OR filaments.color LIKE ?
        OR filaments.material LIKE ?
        OR filaments.brand LIKE ?
      )
    `);
    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
    );
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const products = db
    .prepare(
      `
    ${baseProductSelect()}
    ${whereClause}
    ORDER BY products.created_at DESC
  `,
    )
    .all(...params);

  res.json(products);
}

function getProductById(req, res) {
  const product = findProductWithRelations(req.params.id);

  if (!product) {
    return res.status(404).json({
      error: "Produto não encontrado.",
    });
  }

  res.json(product);
}

function createProduct(req, res) {
  const errors = validateProduct(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Dados inválidos.",
      details: errors,
    });
  }

  const { name, sku, filament_id, estimated_time_minutes, estimated_filament_grams } = req.body;
  const referenceError = validateFilamentReference(filament_id);

  if (referenceError) {
    return res.status(referenceError.status).json({
      error: referenceError.message,
    });
  }

  const result = db
    .prepare(
      `
    INSERT INTO products (
      name,
      sku,
      filament_id,
      quantity,
      estimated_time_minutes,
      estimated_filament_grams
    ) VALUES (?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      name.trim(),
      sku || null,
      toNullableNumber(filament_id),
      0,
      toNullableNumber(estimated_time_minutes),
      toNullableNumber(estimated_filament_grams),
    );

  res.status(201).json(findProductWithRelations(result.lastInsertRowid));
}

function updateProduct(req, res) {
  const errors = validateProduct(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Dados inválidos.",
      details: errors,
    });
  }

  const { id } = req.params;
  const { name, sku, filament_id, estimated_time_minutes, estimated_filament_grams } = req.body;
  const product = findProduct(id);

  if (!product) {
    return res.status(404).json({
      error: "Produto não encontrado.",
    });
  }

  const referenceError = validateFilamentReference(filament_id);

  if (referenceError) {
    return res.status(referenceError.status).json({
      error: referenceError.message,
    });
  }

  db.prepare(
    `
    UPDATE products
    SET
      name = ?,
      sku = ?,
      filament_id = ?,
      quantity = ?,
      estimated_time_minutes = ?,
      estimated_filament_grams = ?
    WHERE id = ?
  `,
  ).run(
    name.trim(),
    sku || null,
    toNullableNumber(filament_id),
    0,
    toNullableNumber(estimated_time_minutes),
    toNullableNumber(estimated_filament_grams),
    id,
  );

  res.json(findProductWithRelations(id));
}

function deleteProduct(req, res) {
  const { id } = req.params;
  const product = findProduct(id);

  if (!product) {
    return res.status(404).json({
      error: "Produto não encontrado.",
    });
  }

  const linkedJobs = db
    .prepare(
      `
    SELECT COUNT(*) AS total
    FROM print_jobs
    WHERE product_id = ?
  `,
    )
    .get(id);

  if (linkedJobs.total > 0) {
    return res.status(400).json({
      error: "Não é possível remover um produto vinculado a pedidos.",
    });
  }

  db.prepare(
    `
    DELETE FROM products
    WHERE id = ?
  `,
  ).run(id);

  res.json({
    message: "Produto removido com sucesso.",
  });
}

function baseProductSelect() {
  return `
    SELECT
      products.*,
      filaments.name AS filament_name,
      filaments.color AS filament_color,
      filaments.material AS filament_material,
      filaments.brand AS filament_brand
    FROM products
    LEFT JOIN filaments ON filaments.id = products.filament_id
  `;
}

function findProduct(id) {
  return db
    .prepare(
      `
    SELECT *
    FROM products
    WHERE id = ?
  `,
    )
    .get(id);
}

function findProductWithRelations(id) {
  return db
    .prepare(
      `
    ${baseProductSelect()}
    WHERE products.id = ?
  `,
    )
    .get(id);
}

function validateFilamentReference(filamentId) {
  if (!filamentId) {
    return null;
  }

  const filament = db
    .prepare(
      `
    SELECT id
    FROM filaments
    WHERE id = ?
  `,
    )
    .get(filamentId);

  if (!filament) {
    return {
      status: 404,
      message: "Filamento informado não existe.",
    };
  }

  return null;
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return Number(value);
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
