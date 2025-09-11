const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { uploadthingRoute } = require("./routes/uploadthing");

const uploadsDir = path.join(__dirname, "uploads");
const reportsDir = path.join(__dirname, "reports");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(uploadsDir));
app.use("/reports", express.static(reportsDir));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.error("MongoDB Connection Error:", err));

app.use("/api/uploadthing", uploadthingRoute);
app.use("/api/auth", require("./routes/auth"));
app.use("/api/submissions", require("./routes/submissions"));
app.use("/api/admin", require("./routes/admin"));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
