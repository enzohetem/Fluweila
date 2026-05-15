const {
  PRINTER_STATUSES
} = require("./constants");

function validateCreatePrinter(data) {
  const errors = [];

  if (!data.name || data.name.trim() === "") {
    errors.push("O nome da impressora é obrigatório.");
  }

  if (data.status && !PRINTER_STATUSES.includes(data.status)) {
    errors.push(`Status inválido. Use: ${PRINTER_STATUSES.join(", ")}.`);
  }

  return errors;
}

function validateUpdatePrinter(data) {
  return validateCreatePrinter(data);
}

function validateUpdatePrinterStatus(data) {
  const errors = [];

  if (!data.status) {
    errors.push("O status é obrigatório.");
  }

  if (data.status && !PRINTER_STATUSES.includes(data.status)) {
    errors.push(`Status inválido. Use: ${PRINTER_STATUSES.join(", ")}.`);
  }

  return errors;
}

module.exports = {
  validateCreatePrinter,
  validateUpdatePrinter,
  validateUpdatePrinterStatus
};
