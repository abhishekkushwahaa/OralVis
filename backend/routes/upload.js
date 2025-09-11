// backend/routes/upload.js
const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const { protect } = require("../middleware/authMiddleware");

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Configure Cloudinary with the hardcoded keys
cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

// This endpoint provides a signature for the frontend to use
router.post("/sign-upload", protect, (req, res) => {
  const timestamp = Math.round(new Date().getTime() / 1000);

  // The signature is created using your API secret
  const signature = cloudinary.utils.api_sign_request(
    { timestamp: timestamp },
    API_SECRET // Uses the hardcoded secret
  );

  res.json({ timestamp, signature });
});

module.exports = router;
