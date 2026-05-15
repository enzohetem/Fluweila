export function productVariationLabel(item) {
  return [item.filament_brand, item.filament_material, item.filament_color]
    .filter((value) => value && String(value).trim() !== "")
    .join(" ");
}

export function filamentLabel(job) {
  return [job.filament_brand, job.filament_material, job.filament_color]
    .filter((value) => value && String(value).trim() !== "")
    .join(" ");
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function statusTone(status) {
  if (status === "completed") return "success";
  if (status === "printing" || status === "in_production") return "info";
  if (status === "ready_to_pack" || status === "packed" || status === "allocated") return "packing";
  if (status === "new" || status === "printed" || status === "waiting_printer" || status === "reprint") return "warning";
  if (status === "failed" || status === "cancelled") return "danger";
  return "neutral";
}

export function priorityTone(priority) {
  if (priority === "urgent") return "danger";
  if (priority === "high") return "warning";
  if (priority === "normal") return "info";
  return "neutral";
}
