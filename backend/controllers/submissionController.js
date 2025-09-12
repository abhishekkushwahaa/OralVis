const Submission = require("../models/Submission");
const PDFDocument = require("pdfkit");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const { PassThrough } = require("stream");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// CREATE SUBMISSION
exports.createSubmission = async (req, res) => {
  const {
    name,
    patientId,
    email,
    note,
    upperTeethUrl,
    frontTeethUrl,
    lowerTeethUrl,
  } = req.body;
  if (!upperTeethUrl || !frontTeethUrl || !lowerTeethUrl) {
    return res
      .status(400)
      .json({ message: "All three image URLs are required" });
  }
  try {
    const newSubmission = new Submission({
      patient: req.user._id,
      patientInfo: { name, patientId, email },
      note,
      upperTeethUrl,
      frontTeethUrl,
      lowerTeethUrl,
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

// DOWNLOAD REPORT
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

    const [
      upperTeethBuffer,
      frontTeethBuffer,
      lowerTeethBuffer,
      annotatedBuffer,
    ] = await Promise.all([
      axios
        .get(submission.upperTeethUrl, { responseType: "arraybuffer" })
        .then((res) => Buffer.from(res.data)),
      axios
        .get(submission.frontTeethUrl, { responseType: "arraybuffer" })
        .then((res) => Buffer.from(res.data)),
      axios
        .get(submission.lowerTeethUrl, { responseType: "arraybuffer" })
        .then((res) => Buffer.from(res.data)),
      axios
        .get(submission.annotatedImageUrl, { responseType: "arraybuffer" })
        .then((res) => Buffer.from(res.data)),
    ]);

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
      Malaligned: "Braces or Clear Aligner",
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

      // --- PDF Content with ABSOLUTE POSITIONS ---

      // Header Section
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("SCREENING REPORT:", 40, 40, { align: "left" });

      // Image Section - Positioned at Y=80
      const imageSectionY = 80;
      const imageWidth = 160;
      const imageHeight = 120;
      const startX = 45;
      const gap = 15;

      const addRoundedImage = (imgBuffer, x, y, w, h, r) => {
        doc.save();
        doc.roundedRect(x, y, w, h, r).clip();
        doc.image(imgBuffer, x, y, { width: w });
        doc.restore();
      };

      addRoundedImage(
        upperTeethBuffer,
        startX,
        imageSectionY,
        imageWidth,
        imageHeight,
        8
      );
      addRoundedImage(
        annotatedBuffer,
        startX + imageWidth + gap,
        imageSectionY,
        imageWidth,
        imageHeight,
        8
      );
      addRoundedImage(
        lowerTeethBuffer,
        startX + 2 * (imageWidth + gap),
        imageSectionY,
        imageWidth,
        imageHeight,
        8
      );

      const labelY = imageSectionY + imageHeight + 10;
      const labelHeight = 25;
      const labelRadius = 12.5;
      doc
        .fillColor("#E57373")
        .roundedRect(startX, labelY, imageWidth, labelHeight, labelRadius)
        .fill();
      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Upper Teeth", startX, labelY + 7, {
          width: imageWidth,
          align: "center",
        });
      doc
        .fillColor("#E57373")
        .roundedRect(
          startX + imageWidth + gap,
          labelY,
          imageWidth,
          labelHeight,
          labelRadius
        )
        .fill();
      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Front Teeth", startX + imageWidth + gap, labelY + 7, {
          width: imageWidth,
          align: "center",
        });
      doc
        .fillColor("#E57373")
        .roundedRect(
          startX + 2 * (imageWidth + gap),
          labelY,
          imageWidth,
          labelHeight,
          labelRadius
        )
        .fill();
      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Lower Teeth", startX + 2 * (imageWidth + gap), labelY + 7, {
          width: imageWidth,
          align: "center",
        });

      // Findings & Legend Section - Positioned at Y=280
      const findingsSectionY = 280;
      doc.y = findingsSectionY;
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
        legendX += doc.widthOfString(finding) + boxSize + 15;
        if (legendX > 480) {
          legendX = 40;
          legendY += 20;
        }
      });

      // Recommendations Section - Positioned absolutely at Y=450
      const recommendationsY = 450;
      doc.y = recommendationsY;
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
        doc.font("Helvetica").text("No specific treatment recommendations.");
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
