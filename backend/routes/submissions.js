const express = require("express");
const router = express.Router();
const {
  createSubmission,
  getMySubmissions,
  downloadReport,
} = require("../controllers/submissionController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").post(protect, createSubmission);
router.route("/mine").get(protect, getMySubmissions);

router.get("/:id/download-report", protect, downloadReport);

module.exports = router;
