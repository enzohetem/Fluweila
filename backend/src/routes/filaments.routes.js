const express = require("express");

const {
  listFilaments,
  getFilamentById,
  createFilament,
  updateFilament,
  updateFilamentStock,
  deleteFilament
} = require("../controllers/filaments.controller");

const router = express.Router();

router.get("/", listFilaments);
router.get("/:id", getFilamentById);
router.post("/", createFilament);
router.put("/:id", updateFilament);
router.patch("/:id/stock", updateFilamentStock);
router.delete("/:id", deleteFilament);

module.exports = router;
