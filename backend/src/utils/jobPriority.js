function calculateJobPriority(deliveryDate, now = new Date()) {
  if (!deliveryDate) {
    return "low";
  }

  const today = startOfDay(now);
  const delivery = parseDateOnly(deliveryDate);

  if (!delivery) {
    return "low";
  }

  const diffDays = Math.round((delivery.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return "urgent";
  }

  if (diffDays === 0) {
    return now.getHours() >= 18 ? "urgent" : "high";
  }

  if (diffDays === 1) {
    return "normal";
  }

  return "low";
}

function parseDateOnly(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

module.exports = {
  calculateJobPriority
};
