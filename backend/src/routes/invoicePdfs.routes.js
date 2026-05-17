const express = require("express");
const {
  listTodayInvoicePdfs,
  uploadInvoicePdf,
  downloadInvoicePdf,
  deleteInvoicePdf,
} = require("../controllers/invoicePdfs.controller");

const router = express.Router();

router.get("/", listTodayInvoicePdfs);
router.post("/", express.raw({ type: "application/pdf", limit: "25mb" }), uploadInvoicePdf);
router.get("/:id/file", downloadInvoicePdf);
router.delete("/:id", deleteInvoicePdf);

module.exports = router;
