const {
  FILAMENT_MATERIALS
} = require("./constants");

function validateCreateFilament(data) {
  const errors = [];

  if (!data.color || data.color.trim() === "") {
    errors.push("A cor do filamento é obrigatória.");
  }

  if (!data.material) {
    errors.push("O material do filamento é obrigatório.");
  }

  if (data.material && !FILAMENT_MATERIALS.includes(data.material)) {
    errors.push(`Material inválido. Use: ${FILAMENT_MATERIALS.join(", ")}.`);
  }

  if (
    data.stock_grams !== undefined &&
    data.stock_grams !== null &&
    (Number.isNaN(Number(data.stock_grams)) || Number(data.stock_grams) < 0)
  ) {
    errors.push("O estoque deve ser um número maior ou igual a zero.");
  }

  return errors;
}

function validateUpdateFilament(data) {
  return validateCreateFilament(data);
}

function validateUpdateFilamentStock(data) {
  const errors = [];

  if (data.stock_grams === undefined || data.stock_grams === null) {
    errors.push("O estoque é obrigatório.");
  }

  if (
    data.stock_grams !== undefined &&
    data.stock_grams !== null &&
    (Number.isNaN(Number(data.stock_grams)) || Number(data.stock_grams) < 0)
  ) {
    errors.push("O estoque deve ser um número maior ou igual a zero.");
  }

  return errors;
}

module.exports = {
  validateCreateFilament,
  validateUpdateFilament,
  validateUpdateFilamentStock
};
