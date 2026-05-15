export const PRINTER_STATUSES = [
  { value: "available", label: "Disponível" },
  { value: "printing", label: "Imprimindo" },
  { value: "maintenance", label: "Manutenção" },
  { value: "offline", label: "Offline" },
];

export const JOB_STATUSES = [
  { value: "waiting_printer", label: "Aguardando impressora" },
  { value: "allocated", label: "Alocado" },
  { value: "printing", label: "Imprimindo" },
  { value: "printed", label: "Impresso" },
  { value: "failed", label: "Falhou" },
  { value: "reprint", label: "Reimprimir" },
];

export const ORDER_STATUSES = [
  { value: "new", label: "Novo" },
  { value: "in_production", label: "Em produção" },
  { value: "ready_to_pack", label: "Pronto para embalar" },
  { value: "packed", label: "Embalado" },
  { value: "completed", label: "Finalizado" },
  { value: "cancelled", label: "Cancelado" },
];

export const JOB_PRIORITIES = [
  { value: "low", label: "Baixa" },
  { value: "normal", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

export const FILAMENT_MATERIALS = ["PLA", "PETG", "ABS", "TPU"];

export function labelFor(options, value) {
  return options.find((item) => item.value === value)?.label || value || "-";
}
