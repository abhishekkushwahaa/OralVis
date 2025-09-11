const express = require("express");
const router = express.Router();
const {
  createSubmission,
  getMySubmissions,
} = require("../controllers/submissionController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").post(protect, createSubmission);
router.route("/mine").get(protect, getMySubmissions);

module.exports = router;
