const express = require("express");

const {
  listJobs,
  listJobHistory,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
} = require("../controllers/jobs.controller");

const router = express.Router();

router.get("/", listJobs);
router.get("/history", listJobHistory);
router.get("/:id", getJobById);
router.post("/", createJob);
router.put("/:id", updateJob);
router.patch("/:id/status", updateJobStatus);
router.delete("/:id", deleteJob);

module.exports = router;
