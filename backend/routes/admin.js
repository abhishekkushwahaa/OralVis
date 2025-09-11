const express = require("express");
const router = express.Router();
const {
  getAllSubmissions,
  getSubmissionById,
  annotateSubmission,
  generateReport,
} = require("../controllers/submissionController");
const { protect, admin } = require("../middleware/authMiddleware");
const upload = require("../config/multerConfig").single("image");

router.route("/submissions").get(protect, admin, getAllSubmissions);
router.route("/submissions/:id").get(protect, admin, getSubmissionById);
router
  .route("/submissions/:id/annotate")
  .put(protect, admin, upload, annotateSubmission);
router.route("/submissions/:id/report").post(protect, admin, generateReport);

module.exports = router;
