const db = require("../database/db");
const { FINAL_JOB_STATUSES } = require("../validations/constants");

function httpError(statusCode, message, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
}

function updateJobStatus(id, status) {
  const job = db.prepare("SELECT * FROM print_jobs WHERE id = ?").get(id);

  if (!job) {
    throw httpError(404, "Trabalho de impressao nao encontrado.");
  }

  if (FINAL_JOB_STATUSES.includes(job.status) && status !== "reprint") {
    throw httpError(400, "Este trabalho ja foi finalizado.");
  }

  if (status === "allocated") {
    return allocateJob(job, id);
  }

  if (status === "printing") {
    return startPrinting(job, id);
  }

  if (status === "printed") {
    return completeJob(job, id);
  }

  if (status === "failed") {
    return failJob(job, id);
  }

  if (status === "reprint") {
    return reprintJob(job, id);
  }

  if (status === "waiting_printer") {
    return returnJobToWaiting(job, id);
  }

  return { message: "Status atualizado com sucesso." };
}

function allocateJob(job, id) {
  if (!job.printer_id) {
    throw httpError(400, "Vincule uma impressora antes de alocar este trabalho.");
  }

  const printer = findPrinter(job.printer_id);

  if (!printer) {
    throw httpError(404, "Impressora vinculada nao foi encontrada.");
  }

  if (printer.status !== "available") {
    throw httpError(400, "A impressora nao esta disponivel para alocacao.");
  }

  db.prepare(
    `
    UPDATE print_jobs
    SET status = 'allocated'
    WHERE id = ?
  `,
  ).run(id);

  syncOrderAfterJob(job.order_id);
  return { message: "Trabalho alocado para a impressora." };
}

function startPrinting(job, id) {
  if (!job.printer_id) {
    throw httpError(400, "Este trabalho nao possui impressora vinculada.");
  }

  const printer = findPrinter(job.printer_id);

  if (!printer) {
    throw httpError(404, "Impressora vinculada nao foi encontrada.");
  }

  const activeJobOnPrinter = findActivePrintingJobByPrinter(job.printer_id);

  if (activeJobOnPrinter && Number(activeJobOnPrinter.id) !== Number(id)) {
    throw httpError(400, "A impressora nao esta disponivel.");
  }

  if (printer.status !== "available" && printer.status !== "printing") {
    throw httpError(400, "A impressora nao esta disponivel.");
  }

  const transaction = db.transaction(() => {
    db.prepare(
      `
      UPDATE print_jobs
      SET
        status = 'printing',
        progress = 0,
        started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
      WHERE id = ?
    `,
    ).run(id);

    db.prepare("UPDATE printers SET status = 'printing' WHERE id = ?").run(
      job.printer_id,
    );
  });

  transaction();
  syncOrderAfterJob(job.order_id);

  return { message: "Impressao iniciada. Impressora marcada como ocupada." };
}

function completeJob(job, id) {
  if (!job.printer_id) {
    throw httpError(400, "Este trabalho nao possui impressora vinculada.");
  }

  if (!job.filament_id) {
    throw httpError(400, "Este trabalho nao possui filamento vinculado.");
  }

  const filament = db.prepare("SELECT * FROM filaments WHERE id = ?").get(job.filament_id);

  if (!filament) {
    throw httpError(404, "Filamento vinculado nao foi encontrado.");
  }

  const usedGrams = job.estimated_filament_grams || 0;
  const newStock = filament.stock_grams - usedGrams;

  if (newStock < 0) {
    throw httpError(400, "Estoque insuficiente para concluir este trabalho.");
  }

  const transaction = db.transaction(() => {
    db.prepare(
      `
      UPDATE print_jobs
      SET
        status = 'printed',
        progress = 100,
        finished_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(id);

    releasePrinterIfJobWasPrinting(job);

    db.prepare("UPDATE filaments SET stock_grams = ? WHERE id = ?").run(
      newStock,
      job.filament_id,
    );
  });

  transaction();
  syncOrderAfterJob(job.order_id);

  return {
    message: "Impressao concluida. Impressora liberada e estoque atualizado.",
    filament_used_grams: usedGrams,
    remaining_stock_grams: newStock,
  };
}

function failJob(job, id) {
  const transaction = db.transaction(() => {
    db.prepare(
      `
      UPDATE print_jobs
      SET status = 'failed'
      WHERE id = ?
    `,
    ).run(id);

    releasePrinterIfJobWasPrinting(job);
  });

  transaction();
  syncOrderAfterJob(job.order_id);
  return { message: "Trabalho marcado como falha. Impressora liberada." };
}

function reprintJob(job, id) {
  const transaction = db.transaction(() => {
    db.prepare(
      `
      UPDATE print_jobs
      SET
        status = 'reprint',
        progress = 0,
        started_at = NULL,
        finished_at = NULL
      WHERE id = ?
    `,
    ).run(id);

    releasePrinterIfJobWasPrinting(job);
  });

  transaction();
  syncOrderAfterJob(job.order_id);
  return { message: "Trabalho enviado para reimpressao." };
}

function returnJobToWaiting(job, id) {
  const transaction = db.transaction(() => {
    db.prepare(
      `
      UPDATE print_jobs
      SET
        status = 'waiting_printer',
        progress = 0
      WHERE id = ?
    `,
    ).run(id);

    releasePrinterIfJobWasPrinting(job);
  });

  transaction();
  syncOrderAfterJob(job.order_id);
  return { message: "Trabalho retornou para aguardando impressora." };
}

function releasePrinterIfJobWasPrinting(job) {
  if (job.status !== "printing" || !job.printer_id) {
    return;
  }

  db.prepare("UPDATE printers SET status = 'available' WHERE id = ?").run(
    job.printer_id,
  );
}

function findPrinter(printerId) {
  return db.prepare("SELECT * FROM printers WHERE id = ?").get(printerId);
}

function findActivePrintingJobByPrinter(printerId) {
  return db
    .prepare(
      `
      SELECT id
      FROM print_jobs
      WHERE printer_id = ?
        AND status = 'printing'
    `,
    )
    .get(printerId);
}

function syncOrderAfterJob(orderId) {
  if (!orderId) {
    return;
  }

  const order = db.prepare("SELECT id, status FROM orders WHERE id = ?").get(orderId);

  if (
    !order ||
    ["cancelled", "ready_to_pack", "packed", "completed"].includes(order.status)
  ) {
    return;
  }

  const data = db
    .prepare(
      `
    SELECT
      COUNT(*) AS total_jobs,
      SUM(CASE WHEN status = 'printed' THEN 1 ELSE 0 END) AS printed_jobs,
      SUM(CASE WHEN status = 'printing' THEN 1 ELSE 0 END) AS printing_jobs,
      SUM(CASE WHEN status = 'allocated' THEN 1 ELSE 0 END) AS allocated_jobs,
      SUM(CASE WHEN status IN ('waiting_printer', 'reprint') THEN 1 ELSE 0 END) AS open_jobs,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_jobs
    FROM print_jobs
    WHERE order_id = ?
  `,
    )
    .get(orderId);

  const total = data.total_jobs || 0;
  const printed = data.printed_jobs || 0;
  const printing = data.printing_jobs || 0;
  const allocated = data.allocated_jobs || 0;
  const open = data.open_jobs || 0;
  const failed = data.failed_jobs || 0;
  let nextStatus = "new";

  if (total > 0 && printed === total) {
    nextStatus = "ready_to_pack";
  } else if (printing > 0 || allocated > 0 || printed > 0 || failed > 0) {
    nextStatus = "in_production";
  }

  if (nextStatus !== order.status) {
    db.prepare(
      "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run(nextStatus, orderId);
  }
}

module.exports = {
  updateJobStatus,
  httpError,
};
