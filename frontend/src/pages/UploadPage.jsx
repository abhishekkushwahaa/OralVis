import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;

const ImageUploader = ({ title, onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useContext(AuthContext);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data: signData } = await axios.post(
        "/api/sign-upload",
        {},
        config
      );
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", CLOUDINARY_API_KEY);
      formData.append("timestamp", signData.timestamp);
      formData.append("signature", signData.signature);
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
      const { data: cloudinaryData } = await axios.post(
        cloudinaryUrl,
        formData
      );
      onUploadComplete(cloudinaryData.secure_url); // Pass the URL up to the parent
    } catch (error) {
      console.error(`Upload failed for ${title}`, error);
      alert(`Upload failed for ${title}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      style={{
        border: "1px dashed #ccc",
        padding: "1rem",
        textAlign: "center",
        marginBottom: "1rem",
      }}
    >
      <h4>{title}</h4>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || isUploading}
      >
        {isUploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
};

const UploadPage = () => {
  const [patientId, setPatientId] = useState("");
  const [note, setNote] = useState("");
  const [urls, setUrls] = useState({ upper: "", front: "", lower: "" });
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const allImagesUploaded = urls.upper && urls.front && urls.lower;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allImagesUploaded) {
      alert("Please upload all three images.");
      return;
    }
    try {
      const submissionData = {
        name: user.name,
        email: user.email,
        patientId,
        note,
        upperTeethUrl: urls.upper,
        frontTeethUrl: urls.front,
        lowerTeethUrl: urls.lower,
      };
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post("/api/submissions", submissionData, config);
      navigate("/dashboard");
    } catch (error) {
      alert("Submission failed: " + error.response?.data?.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "700px" }}>
      <h2>Upload Patient Photos</h2>
      <input
        type="text"
        value={patientId}
        onChange={(e) => setPatientId(e.target.value)}
        placeholder="Patient ID"
        required
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note..."
      ></textarea>

      <ImageUploader
        title="Upper Teeth"
        onUploadComplete={(url) => setUrls((prev) => ({ ...prev, upper: url }))}
      />
      {urls.upper && (
        <p style={{ color: "green", textAlign: "center" }}>
          Upper Teeth image is ready!
        </p>
      )}

      <ImageUploader
        title="Front Teeth"
        onUploadComplete={(url) => setUrls((prev) => ({ ...prev, front: url }))}
      />
      {urls.front && (
        <p style={{ color: "green", textAlign: "center" }}>
          Front Teeth image is ready!
        </p>
      )}

      <ImageUploader
        title="Lower Teeth"
        onUploadComplete={(url) => setUrls((prev) => ({ ...prev, lower: url }))}
      />
      {urls.lower && (
        <p style={{ color: "green", textAlign: "center" }}>
          Lower Teeth image is ready!
        </p>
      )}

      <button type="submit" disabled={!allImagesUploaded}>
        Submit All Details
      </button>
    </form>
  );
};

export default UploadPage;
