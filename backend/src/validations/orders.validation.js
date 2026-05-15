const { ORDER_STATUSES } = require("./constants");

function validateCreateOrder(data) {
  const errors = [];

  if (!data.customer_name || data.customer_name.trim() === "") {
    errors.push("O nome do cliente e obrigatorio.");
  }

  if (!data.delivery_date) {
    errors.push("A data de entrega e obrigatoria.");
  }

  if (data.delivery_date && !isValidDateOnly(data.delivery_date)) {
    errors.push("A data de entrega deve estar no formato YYYY-MM-DD.");
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.push("Informe ao menos um item no pedido.");
  } else {
    data.items.forEach((item, index) => {
      if (!item.product_id || Number.isNaN(Number(item.product_id))) {
        errors.push(`O produto do item ${index + 1} e obrigatorio.`);
      }

      if (
        item.quantity === undefined ||
        item.quantity === null ||
        Number.isNaN(Number(item.quantity)) ||
        Number(item.quantity) < 1
      ) {
        errors.push(`A quantidade do item ${index + 1} deve ser maior que zero.`);
      }
    });
  }

  return errors;
}

function validateUpdateOrderStatus(data) {
  const errors = [];

  if (!data.status) {
    errors.push("O status e obrigatorio.");
  }

  if (data.status && !ORDER_STATUSES.includes(data.status)) {
    errors.push(`Status invalido. Use: ${ORDER_STATUSES.join(", ")}.`);
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
  validateCreateOrder,
  validateUpdateOrderStatus,
};
