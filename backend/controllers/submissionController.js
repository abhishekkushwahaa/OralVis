const Submission = require("../models/Submission");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

exports.createSubmission = async (req, res) => {
  const { name, patientId, email, note, originalImageUrl } = req.body;

  if (!originalImageUrl) {
    return res.status(400).json({ message: "Image URL is required" });
  }

  try {
    const newSubmission = new Submission({
      patient: req.user._id,
      patientInfo: { name, patientId, email },
      note,
      originalImageUrl: originalImageUrl,
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
      submission.annotationData = JSON.parse(req.body.annotationData);
      submission.annotatedImageUrl = req.file.path.replace(/\\/g, "/"); // Standardize path
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

exports.generateReport = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission)
      return res.status(404).json({ message: "Submission not found" });

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const reportName = `report-${submission._id}.pdf`;
    const reportPath = path.join(__dirname, "..", "reports", reportName);

    doc.pipe(fs.createWriteStream(reportPath));

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
    doc.fontSize(10).font("Helvetica-Bold").text("Original Image", 50, imageY);
    if (fs.existsSync(submission.originalImageUrl)) {
      doc.image(submission.originalImageUrl, 50, imageY + 15, {
        width: imageWidth,
        height: imageHeight,
        align: "center",
        valign: "center",
      });
    } else {
      doc.text("Original image not found.", 50, imageY + 15);
    }

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Annotated Image", 310, imageY);
    if (fs.existsSync(submission.annotatedImageUrl)) {
      doc.image(submission.annotatedImageUrl, 310, imageY + 15, {
        width: imageWidth,
        height: imageHeight,
        align: "center",
        valign: "center",
      });
    } else {
      doc.text("Annotated image not found.", 310, imageY + 15);
    }

    const findingsY = imageY + imageHeight + 30;
    doc.y = findingsY;
    doc.x = 40;
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Findings", { underline: true });
    if (submission.annotationData && submission.annotationData.length > 0) {
      const listItems = submission.annotationData.map((ann) => `${ann.label}`);
      doc
        .font("Helvetica")
        .list(listItems, { bulletRadius: 2.5, textIndent: 10, indent: 20 });
    } else {
      doc.font("Helvetica").text("No specific annotations were made.");
    }
    doc.moveDown();

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Patient Notes", { underline: true });
    doc
      .font("Helvetica")
      .text(submission.note || "No additional notes provided by the patient.");

    doc.end();

    const reportUrl = `/reports/${reportName}`;
    submission.reportUrl = reportUrl;
    submission.status = "reported";
    await submission.save();

    res.json({ message: "Report generated", reportUrl: reportUrl });
  } catch (error) {
    res
      .status(500)
      .json({ message: "PDF Generation Error", error: error.message });
  }
};
