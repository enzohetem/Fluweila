const db = require("../database/db");

function validateFilamentStockAvailability(requirements, options = {}) {
  const totalsByFilament = new Map();
  const creditsByFilament = aggregateRequirements(options.creditRequirements || []);

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

    const availableGrams =
      Number(filament.stock_grams || 0) + (creditsByFilament.get(filamentId) || 0);

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

function reserveFilamentStock(requirements) {
  adjustFilamentStock(aggregateRequirements(requirements), -1);
}

function releaseFilamentStock(requirements) {
  adjustFilamentStock(aggregateRequirements(requirements), 1);
}

function aggregateRequirements(requirements) {
  const totalsByFilament = new Map();

  requirements.forEach((requirement) => {
    const filamentId = toNullableNumber(requirement.filament_id);
    const grams = Number(requirement.estimated_filament_grams || 0);
    const quantity = Number(requirement.quantity || 1);
    const totalGrams = grams * quantity;

    if (!filamentId || totalGrams <= 0) {
      return;
    }

    totalsByFilament.set(
      filamentId,
      (totalsByFilament.get(filamentId) || 0) + totalGrams,
    );
  });

  return totalsByFilament;
}

function adjustFilamentStock(totalsByFilament, direction) {
  for (const [filamentId, grams] of totalsByFilament.entries()) {
    db.prepare(
      `
      UPDATE filaments
      SET stock_grams = stock_grams + ?
      WHERE id = ?
    `,
    ).run(grams * direction, filamentId);
  }
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return Number(value);
}

module.exports = {
  validateFilamentStockAvailability,
  reserveFilamentStock,
  releaseFilamentStock,
};
