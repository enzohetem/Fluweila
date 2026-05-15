const PRINTER_STATUSES = ["available", "printing", "maintenance", "offline"];

const FILAMENT_MATERIALS = ["PLA", "PETG", "ABS", "TPU"];

const JOB_PRIORITIES = ["low", "normal", "high", "urgent"];

const ORDER_STATUSES = [
  "new",
  "in_production",
  "ready_to_pack",
  "packed",
  "completed",
  "cancelled",
];

const JOB_STATUSES = [
  "waiting_printer",
  "allocated",
  "printing",
  "printed",
  "failed",
  "reprint",
];

const FINAL_JOB_STATUSES = ["printed"];

module.exports = {
  PRINTER_STATUSES,
  FILAMENT_MATERIALS,
  JOB_PRIORITIES,
  ORDER_STATUSES,
  JOB_STATUSES,
  FINAL_JOB_STATUSES,
};
