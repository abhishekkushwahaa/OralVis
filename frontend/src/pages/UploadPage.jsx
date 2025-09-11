import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
// console.log("Cloudinary Config:", {
//   CLOUDINARY_CLOUD_NAME,
//   CLOUDINARY_API_KEY,
// });
const UploadPage = () => {
  const [patientId, setPatientId] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }
    setIsUploading(true);

    try {
      // 1. Get signature from our backend
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data: signData } = await axios.post(
        "/api/sign-upload",
        {},
        config
      );

      // 2. Create FormData and upload directly to Cloudinary
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

      setImageUrl(cloudinaryData.secure_url);
      alert("Upload successful!");
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageUrl) {
      alert("Please upload an image first.");
      return;
    }
    try {
      const submissionData = {
        name: user.name,
        email: user.email,
        patientId,
        note,
        originalImageUrl: imageUrl,
      };
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post("/api/submissions", submissionData, config);
      navigate("/dashboard");
    } catch (error) {
      alert("Submission failed: " + error.response?.data?.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Upload Teeth Photo</h2>
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

      <div
        style={{
          border: "1px dashed #ccc",
          padding: "1rem",
          textAlign: "center",
        }}
      >
        <input type="file" onChange={handleFileChange} />
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || isUploading}
        >
          {isUploading ? "Uploading..." : "1. Upload Image"}
        </button>
        {imageUrl && <p style={{ color: "green" }}>Image ready!</p>}
      </div>

      <button type="submit" disabled={!imageUrl}>
        2. Submit All Details
      </button>
    </form>
  );
};

export default UploadPage;
