const Submission = require("../models/Submission");
const PDFDocument = require("pdfkit");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const { PassThrough } = require("stream");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.createSubmission = async (req, res) => {
  const { name, patientId, email, note, originalImageUrl } = req.body;
  if (!originalImageUrl)
    return res.status(400).json({ message: "Image URL is required" });
  try {
    const newSubmission = new Submission({
      patient: req.user._id,
      patientInfo: { name, patientId, email },
      note,
      originalImageUrl,
    });
    const saved = await newSubmission.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ patient: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getAllSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({})
      .populate("patient", "name email")
      .sort({ createdAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getSubmissionById = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission)
      return res.status(404).json({ message: "Submission not found" });
    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.annotateSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (submission) {
      submission.annotationData = req.body.annotationData;
      submission.annotatedImageUrl = req.body.annotatedImageUrl;
      submission.status = "annotated";
      const updated = await submission.save();
      res.json(updated);
    } else {
      res.status(404).json({ message: "Submission not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.downloadReport = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission || !submission.reportUrl) {
      console.log("Submission not found or reportUrl missing");
      return res.status(404).json({ message: "Report not available." });
    }

    console.log("Attempting to download report from:", submission.reportUrl);

    const cloudinaryResponse = await axios.get(submission.reportUrl, {
      responseType: "stream",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report-${submission.patientInfo.patientId}.pdf"`
    );

    cloudinaryResponse.data.pipe(res);
  } catch (error) {
    console.error(
      "Full download error details:",
      error.response?.status,
      error.response?.data || error.message
    );
    res.status(500).json({
      message: "Failed to download report",
      error: error.response?.data || error.message,
    });
  }
};

exports.generateReport = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission || !submission.annotatedImageUrl) {
      return res
        .status(400)
        .json({ message: "Submission not found or not yet annotated." });
    }

    const originalImageResponse = await axios.get(submission.originalImageUrl, {
      responseType: "arraybuffer",
    });
    const originalImageBuffer = Buffer.from(originalImageResponse.data);

    const annotatedImageResponse = await axios.get(
      submission.annotatedImageUrl,
      { responseType: "arraybuffer" }
    );

    const annotatedImageBuffer = Buffer.from(annotatedImageResponse.data);

    const doc = new PDFDocument({ size: "A4", margin: 40 });

    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "oralvis-reports",
          resource_type: "auto",
          access_mode: "public",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      doc.pipe(uploadStream);

      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("OralVis Healthcare - Dental Report", { align: "center" });
      doc.moveDown(2);
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Patient Details", { underline: true });
      doc.font("Helvetica").text(`Name: ${submission.patientInfo.name}`);
      doc.text(`Patient ID: ${submission.patientInfo.patientId}`);
      doc.text(`Submission Date: ${submission.createdAt.toLocaleDateString()}`);
      doc.moveDown();

      const imageWidth = 240;
      const imageHeight = 200;
      const imageY = doc.y;
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Original Image", 50, imageY);
      doc.image(originalImageBuffer, 50, imageY + 15, {
        width: imageWidth,
        height: imageHeight,
        align: "center",
        valign: "center",
      });

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Annotated Image", 310, imageY);
      doc.image(annotatedImageBuffer, 310, imageY + 15, {
        width: imageWidth,
        height: imageHeight,
        align: "center",
        valign: "center",
      });

      const findingsY = imageY + imageHeight + 30;
      doc.y = findingsY;
      doc.x = 40;
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Findings", { underline: true });
      if (submission.annotationData && submission.annotationData.length > 0) {
        const listItems = submission.annotationData.map(
          (ann) => `${ann.label}`
        );
        doc.font("Helvetica").list(listItems, { bulletRadius: 2.5 });
      } else {
        doc.font("Helvetica").text("No annotations made.");
      }

      doc.end();
    });

    const cloudinaryResult = await uploadPromise;
    const reportUrl = cloudinaryResult.secure_url;

    submission.reportUrl = reportUrl;
    submission.status = "reported";
    await submission.save();

    res.json({ message: "Report generated successfully", reportUrl });
  } catch (error) {
    console.error("PDF Generation Error:", error);
    res.status(500).json({ message: "Error generating PDF report." });
  }
};
