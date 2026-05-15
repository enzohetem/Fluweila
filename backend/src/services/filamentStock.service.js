const db = require("../database/db");

const RESERVED_JOB_STATUSES = ["waiting_printer", "allocated", "printing", "reprint"];

function validateFilamentStockAvailability(requirements, options = {}) {
  const totalsByFilament = new Map();

  requirements.forEach((requirement) => {
    const filamentId = toNullableNumber(requirement.filament_id);
    const grams = Number(requirement.estimated_filament_grams || 0);
    const quantity = Number(requirement.quantity || 1);
    const requiredGrams = grams * quantity;

    if (!filamentId && requiredGrams > 0) {
      return totalsByFilament.set("__missing__", requiredGrams);
    }

    if (!filamentId || requiredGrams <= 0) {
      return;
    }

    totalsByFilament.set(
      filamentId,
      (totalsByFilament.get(filamentId) || 0) + requiredGrams,
    );
  });

  if (totalsByFilament.has("__missing__")) {
    return {
      status: 400,
      message: "Informe um filamento para validar o estoque antes de adicionar a fila.",
    };
  }

  for (const [filamentId, requiredGrams] of totalsByFilament.entries()) {
    const filament = db
      .prepare(
        `
        SELECT id, name, stock_grams
        FROM filaments
        WHERE id = ?
      `,
      )
      .get(filamentId);

    if (!filament) {
      return {
        status: 404,
        message: "Filamento informado nao existe.",
      };
    }

    const reservedGrams = getReservedFilamentGrams(filamentId, options.excludeJobId);
    const availableGrams = Number(filament.stock_grams || 0) - reservedGrams;

    if (requiredGrams > availableGrams) {
      return {
        status: 400,
        message: `Estoque insuficiente para ${filament.name}. Disponivel: ${Math.max(
          availableGrams,
          0,
        )}g. Necessario: ${requiredGrams}g.`,
      };
    }
  }

  return null;
}

function getReservedFilamentGrams(filamentId, excludeJobId) {
  const params = [filamentId, ...RESERVED_JOB_STATUSES];
  const excludeClause = excludeJobId ? "AND id != ?" : "";

  if (excludeJobId) {
    params.push(excludeJobId);
  }

  const result = db
    .prepare(
      `
      SELECT COALESCE(SUM(COALESCE(estimated_filament_grams, 0)), 0) AS total
      FROM print_jobs
      WHERE filament_id = ?
        AND status IN (${RESERVED_JOB_STATUSES.map(() => "?").join(", ")})
        ${excludeClause}
    `,
    )
    .get(...params);

  return Number(result.total || 0);
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return Number(value);
}

module.exports = {
  validateFilamentStockAvailability,
};
