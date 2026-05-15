const {
  JOB_STATUSES
} = require("./constants");

function validateCreateJob(data) {
  const errors = [];

  if (!data.customer_name || data.customer_name.trim() === "") {
    errors.push("O nome do cliente é obrigatório.");
  }

  if (!data.delivery_date) {
    errors.push("A data de entrega é obrigatória.");
  }

  if (data.delivery_date && !isValidDateOnly(data.delivery_date)) {
    errors.push("A data de entrega deve estar no formato YYYY-MM-DD.");
  }

  if (
    data.estimated_time_minutes !== undefined &&
    data.estimated_time_minutes !== null &&
    (Number.isNaN(Number(data.estimated_time_minutes)) || Number(data.estimated_time_minutes) < 0)
  ) {
    errors.push("O tempo estimado deve ser um número maior ou igual a zero.");
  }

  if (
    data.estimated_filament_grams !== undefined &&
    data.estimated_filament_grams !== null &&
    (Number.isNaN(Number(data.estimated_filament_grams)) || Number(data.estimated_filament_grams) < 0)
  ) {
    errors.push("O consumo estimado de filamento deve ser um número maior ou igual a zero.");
  }

  if (
    data.printer_id !== undefined &&
    data.printer_id !== null &&
    Number.isNaN(Number(data.printer_id))
  ) {
    errors.push("O ID da impressora deve ser numérico.");
  }

  if (
    data.filament_id !== undefined &&
    data.filament_id !== null &&
    Number.isNaN(Number(data.filament_id))
  ) {
    errors.push("O ID do filamento deve ser numérico.");
  }

  if (
    data.product_id !== undefined &&
    data.product_id !== null &&
    data.product_id !== "" &&
    Number.isNaN(Number(data.product_id))
  ) {
    errors.push("O ID do produto deve ser numérico.");
  }

  return errors;
}

function validateUpdateJob(data) {
  return validateCreateJob(data);
}

function validateUpdateJobStatus(data) {
  const errors = [];

  if (!data.status) {
    errors.push("O status é obrigatório.");
  }

  if (data.status && !JOB_STATUSES.includes(data.status)) {
    errors.push(`Status inválido. Use: ${JOB_STATUSES.join(", ")}.`);
  }

  return errors;
}

function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

module.exports = {
  validateCreateJob,
  validateUpdateJob,
  validateUpdateJobStatus
};
