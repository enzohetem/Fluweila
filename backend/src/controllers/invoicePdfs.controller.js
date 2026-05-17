const fs = require("fs");
const path = require("path");
const db = require("../database/db");

const uploadRoot = path.resolve(__dirname, "../../uploads/shipping-labels");
const maxPdfSizeBytes = 25 * 1024 * 1024;

function listTodayInvoicePdfs(req, res) {
  const invoices = db
    .prepare(
      `
      SELECT
        id,
        original_name,
        size_bytes,
        uploaded_at
      FROM invoice_pdfs
      WHERE DATE(uploaded_at, 'localtime') = DATE('now', 'localtime')
      ORDER BY DATETIME(uploaded_at) DESC, id DESC
    `,
    )
    .all();

  res.json({ data: invoices });
}

function uploadInvoicePdf(req, res) {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: "Envie um arquivo PDF." });
  }

  if (req.body.length > maxPdfSizeBytes) {
    return res.status(400).json({ error: "O PDF deve ter no maximo 25 MB." });
  }

  const originalName = sanitizeOriginalName(
    req.headers["x-file-name"] || "etiqueta-envio.pdf",
  );

  if (!originalName.toLowerCase().endsWith(".pdf")) {
    return res.status(400).json({ error: "Apenas arquivos PDF sao permitidos." });
  }

  const todayFolder = currentLocalDateFolder();
  const targetDir = path.join(uploadRoot, todayFolder);
  fs.mkdirSync(targetDir, { recursive: true });

  const storedName = `${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`;
  const filePath = path.join(targetDir, storedName);
  fs.writeFileSync(filePath, req.body);

  const result = db
    .prepare(
      `
      INSERT INTO invoice_pdfs (
        original_name,
        stored_name,
        file_path,
        size_bytes
      ) VALUES (?, ?, ?, ?)
    `,
    )
    .run(originalName, storedName, filePath, req.body.length);

  const invoice = db
    .prepare(
      `
      SELECT
        id,
        original_name,
        size_bytes,
        uploaded_at
      FROM invoice_pdfs
      WHERE id = ?
    `,
    )
    .get(result.lastInsertRowid);

  res.status(201).json(invoice);
}

function downloadInvoicePdf(req, res) {
  const invoice = findInvoice(req.params.id);

  if (!invoice) {
    return res.status(404).json({ error: "Etiqueta de envio nao encontrada." });
  }

  res.sendFile(invoice.file_path, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.original_name}"`,
    },
  });
}

function deleteInvoicePdf(req, res) {
  const invoice = findInvoice(req.params.id);

  if (!invoice) {
    return res.status(404).json({ error: "Etiqueta de envio nao encontrada." });
  }

  db.prepare("DELETE FROM invoice_pdfs WHERE id = ?").run(req.params.id);

  try {
    fs.unlinkSync(invoice.file_path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  res.json({ message: "Etiqueta de envio removida com sucesso." });
}

function findInvoice(id) {
  return db.prepare("SELECT * FROM invoice_pdfs WHERE id = ?").get(id);
}

function sanitizeOriginalName(name) {
  let decodedName = String(name);

  try {
    decodedName = decodeURIComponent(decodedName);
  } catch {
    decodedName = String(name);
  }

  const baseName = path.basename(decodedName);
  const normalized = baseName.replace(/[^\w.\-() ]/g, "").trim();
  return normalized || "etiqueta-envio.pdf";
}

function currentLocalDateFolder() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

module.exports = {
  listTodayInvoicePdfs,
  uploadInvoicePdf,
  downloadInvoicePdf,
  deleteInvoicePdf,
};
