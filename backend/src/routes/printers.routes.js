const express = require("express");

const {
  listPrinters,
  getPrinterById,
  createPrinter,
  updatePrinter,
  updatePrinterStatus,
  deletePrinter
} = require("../controllers/printers.controller");

const router = express.Router();

router.get("/", listPrinters);
router.get("/:id", getPrinterById);
router.post("/", createPrinter);
router.put("/:id", updatePrinter);
router.patch("/:id/status", updatePrinterStatus);
router.delete("/:id", deletePrinter);

module.exports = router;
