const mongoose = require("mongoose");

const annotationDetailSchema = new mongoose.Schema(
  {
    shape: { type: String, required: true },
    label: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientInfo: {
      name: { type: String, required: true },
      patientId: { type: String, required: true },
      email: { type: String, required: true },
    },
    note: { type: String },
    status: {
      type: String,
      enum: ["uploaded", "annotated", "reported"],
      default: "uploaded",
    },
    upperTeethUrl: { type: String },
    frontTeethUrl: { type: String },
    lowerTeethUrl: { type: String },
    annotatedImageUrl: { type: String },
    annotationData: [annotationDetailSchema],
    reportUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);
