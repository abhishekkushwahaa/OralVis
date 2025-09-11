import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Stage, Layer, Image, Rect } from "react-konva";
import useImage from "use-image";
import { AuthContext } from "../context/AuthContext.jsx";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;

const dataURLtoFile = (dataurl, filename) => {
  let arr = dataurl.split(","),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

const ANNOTATION_TYPES = ["Caries", "Stain", "Scaling", "Calculus", "Other"];

const AnnotationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [submission, setSubmission] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [originalImage] = useImage(
    submission ? submission.originalImageUrl : "",
    "anonymous"
  );
  const [newAnnotation, setNewAnnotation] = useState(null);
  const [currentLabel, setCurrentLabel] = useState(ANNOTATION_TYPES[0]);
  const stageRef = useRef(null);

  useEffect(() => {
    if (user?.token) {
      const fetchSubmission = async () => {
        try {
          const config = { headers: { Authorization: `Bearer ${user.token}` } };
          const { data } = await axios.get(
            `/api/admin/submissions/${id}`,
            config
          );
          setSubmission(data);
          setAnnotations(data.annotationData || []);
        } catch {
          console.error("Failed to fetch submission");
          alert("Could not load submission data.");
        }
      };
      fetchSubmission();
    }
  }, [id, user?.token]);

  const handleMouseDown = (e) => {
    if (newAnnotation) return;
    const pos = e.target.getStage().getPointerPosition();
    setNewAnnotation({ x: pos.x, y: pos.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!newAnnotation) return;
    const pos = e.target.getStage().getPointerPosition();
    setNewAnnotation({
      ...newAnnotation,
      width: pos.x - newAnnotation.x,
      height: pos.y - newAnnotation.y,
    });
  };

  const handleMouseUp = () => {
    if (!newAnnotation) return;
    setAnnotations([
      ...annotations,
      { shape: "rect", label: currentLabel, details: newAnnotation },
    ]);
    setNewAnnotation(null);
  };

  const handleSave = async () => {
    if (!stageRef.current) return;
    setIsSaving(true);
    try {
      const dataURL = stageRef.current.toDataURL({ mimeType: "image/png" });
      const annotatedFile = dataURLtoFile(dataURL, `annotated-${id}.png`);

      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data: signData } = await axios.post(
        "/api/sign-upload",
        {},
        config
      );

      const formData = new FormData();
      formData.append("file", annotatedFile);
      formData.append("api_key", CLOUDINARY_API_KEY);
      formData.append("timestamp", signData.timestamp);
      formData.append("signature", signData.signature);
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
      const { data: cloudinaryData } = await axios.post(
        cloudinaryUrl,
        formData
      );
      const annotatedImageUrl = cloudinaryData.secure_url;

      const payload = { annotatedImageUrl, annotationData: annotations };
      await axios.put(`/api/admin/submissions/${id}/annotate`, payload, config);

      alert("Annotation saved successfully! You can now generate the report.");
      setSubmission((prev) => ({ ...prev, status: "annotated" }));
    } catch (error) {
      console.error("Failed to save annotation:", error);
      alert("Failed to save annotation.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`/api/admin/submissions/${id}/report`, {}, config);
      alert("Report generation started!");
      navigate("/admin/dashboard");
    } catch {
      alert(
        "Failed to generate report. Make sure you have saved the annotation image first."
      );
    }
  };

  if (!submission) return <div>Loading...</div>;

  const allRectsToDraw = [
    ...annotations.map((a) => a.details),
    ...(newAnnotation ? [newAnnotation] : []),
  ];

  return (
    <div>
      <h2>Annotate for {submission.patientInfo.name}</h2>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <select
          value={currentLabel}
          onChange={(e) => setCurrentLabel(e.target.value)}
        >
          {ANNOTATION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={annotations.length === 0 || isSaving}
        >
          {isSaving ? "Saving..." : "1. Save Annotated Image"}
        </button>
        <button
          onClick={handleGenerateReport}
          disabled={submission.status !== "annotated"}
        >
          2. Generate Report
        </button>
      </div>
      <div style={{ border: "1px solid #ccc", display: "inline-block" }}>
        <Stage
          width={800}
          height={600}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          ref={stageRef}
        >
          <Layer>
            <Image image={originalImage} width={800} height={600} />
            {allRectsToDraw.map((rect, i) => (
              <Rect
                key={i}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                fill="transparent"
                stroke="red"
                strokeWidth={3}
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

export default AnnotationPage;
