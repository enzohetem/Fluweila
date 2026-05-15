function validateProduct(data) {
  const errors = [];

  if (!data.name || data.name.trim() === "") {
    errors.push("O nome do produto é obrigatório.");
  }

  if (
    data.filament_id !== undefined &&
    data.filament_id !== null &&
    data.filament_id !== "" &&
    Number.isNaN(Number(data.filament_id))
  ) {
    errors.push("O ID do filamento deve ser numérico.");
  }

  if (
    data.estimated_time_minutes !== undefined &&
    data.estimated_time_minutes !== null &&
    data.estimated_time_minutes !== "" &&
    (
      Number.isNaN(Number(data.estimated_time_minutes)) ||
      Number(data.estimated_time_minutes) < 0
    )
  ) {
    errors.push("O tempo estimado deve ser um número maior ou igual a zero.");
  }

  if (
    data.estimated_filament_grams !== undefined &&
    data.estimated_filament_grams !== null &&
    data.estimated_filament_grams !== "" &&
    (
      Number.isNaN(Number(data.estimated_filament_grams)) ||
      Number(data.estimated_filament_grams) < 0
    )
  ) {
    errors.push("O filamento estimado deve ser um número maior ou igual a zero.");
  }

  return errors;
}

module.exports = {
  validateProduct
};
