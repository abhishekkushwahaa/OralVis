const Submission = require("../models/Submission");
const PDFDocument = require("pdfkit");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const { PassThrough } = require("stream");

// Configure Cloudinary using your environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// CREATE SUBMISSION (Handles multiple images)
exports.createSubmission = async (req, res) => {
  const { name, patientId, email, note, originalImageUrls } = req.body;
  if (!originalImageUrls || originalImageUrls.length === 0) {
    return res.status(400).json({ message: "Image URLs are required" });
  }
  try {
    const newSubmission = new Submission({
      patient: req.user._id,
      patientInfo: { name, patientId, email },
      note,
      originalImageUrls,
    });
    const saved = await newSubmission.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// GET PATIENT'S SUBMISSIONS
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

// GET ALL SUBMISSIONS (ADMIN)
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

// GET SUBMISSION BY ID (ADMIN)
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

// ANNOTATE SUBMISSION (ADMIN)
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

// DOWNLOAD REPORT (ADMIN/PATIENT)
exports.downloadReport = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission || !submission.reportUrl) {
      return res.status(404).json({ message: "Report not available." });
    }
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
    console.error("Download error:", error.message);
    res.status(500).json({ message: "Failed to download report" });
  }
};

// GENERATE PDF REPORT (ADMIN)
exports.generateReport = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission || !submission.annotatedImageUrl) {
      return res
        .status(400)
        .json({ message: "Submission not found or not yet annotated." });
    }

    // --- THIS IS THE CORRECTED LINE ---
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

    const colorMap = {
      Stains: "#D9534F",
      Crowns: "#C71585",
      Malaligned: "#F0AD4E",
      "Receded gums": "#E6E6FA",
      Attrition: "#5BC0DE",
      "Inflammed/Red gums": "#A020F0",
      Caries: "#5CB85C",
      Scaling: "#337AB7",
      Other: "#777777",
    };
    const recommendationMap = {
      Stains: "Teeth cleaning and polishing.",
      Crowns:
        "If the crown is loose or broken, better get it checked. Teeth coloured caps are the best ones.",
      Malaligned: "Braces or Clear Aligner.",
      "Receded gums": "Gum Surgery.",
      Attrition: "Filling/ Night Guard.",
      "Inflammed/Red gums": "Scaling.",
      Caries:
        "A filling is required to treat the cavity and prevent further decay.",
      Scaling:
        "Professional scaling is recommended to remove plaque and tartar.",
    };

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
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("SCREENING REPORT:", { align: "left" });
      doc.moveDown(1);

      const imageWidth = 240;
      const imageHeight = 200;
      const imageY = doc.y;
      doc.image(originalImageBuffer, 50, imageY, {
        width: imageWidth,
        height: imageHeight,
        align: "center",
        valign: "center",
      });
      doc.image(annotatedImageBuffer, 310, imageY, {
        width: imageWidth,
        height: imageHeight,
        align: "center",
        valign: "center",
      });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Original Image", 50 + imageWidth / 4, imageY + imageHeight + 5);
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(
          "Annotated Image",
          310 + imageWidth / 4,
          imageY + imageHeight + 5
        );

      const findingsY = imageY + imageHeight + 40;
      doc.y = findingsY;
      doc.x = 40;

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("FINDINGS:", { underline: true });
      doc.moveDown();
      const findings = submission.annotationData.map((ann) => ann.label);
      const uniqueFindings = [...new Set(findings)];
      let legendX = doc.x;
      let legendY = doc.y;
      const boxSize = 10;
      uniqueFindings.forEach((finding) => {
        const color = colorMap[finding] || colorMap["Other"];
        doc.fillColor(color).rect(legendX, legendY, boxSize, boxSize).fill();
        doc
          .fillColor("black")
          .font("Helvetica")
          .fontSize(10)
          .text(finding, legendX + boxSize + 5, legendY, { lineBreak: false });
        legendX += doc.widthOfString(finding) + boxSize + 30;
        if (legendX > 480) {
          legendX = 40;
          legendY += 20;
        }
      });
      doc.moveDown(3);

      doc.y = legendY + 40;
      doc.x = 40;
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("TREATMENT RECOMMENDATIONS:", { underline: true });
      doc.moveDown();
      if (uniqueFindings.length > 0) {
        uniqueFindings.forEach((finding) => {
          if (recommendationMap[finding]) {
            doc.font("Helvetica-Bold").fontSize(11).text(`• ${finding}:`);
            doc
              .font("Helvetica")
              .fontSize(10)
              .text(recommendationMap[finding], { indent: 20 });
            doc.moveDown(0.5);
          }
        });
      } else {
        doc.font("Helvetica").text("No specific findings to report.");
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
