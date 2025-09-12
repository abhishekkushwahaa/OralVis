import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext.jsx";

// --- Data Maps from the Demo PDF ---
const FINDING_TYPES = [
  "Stains",
  "Crowns",
  "Malaligned",
  "Receded gums",
  "Attrition",
  "Inflammed/Red gums",
  "Caries",
  "Scaling",
  "Other",
];
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
  Scaling: "Professional scaling is recommended to remove plaque and tartar.",
};
// ---------------------------------------------

const AnnotationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [submission, setSubmission] = useState(null);
  const [checkedFindings, setCheckedFindings] = useState({});
  const [isSaving, setIsSaving] = useState(false);

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
          // Pre-populate checkboxes if findings were already saved
          const initialChecks = {};
          data.annotationData?.forEach((item) => {
            initialChecks[item.label] = true;
          });
          setCheckedFindings(initialChecks);
        } catch (error) {
          console.error("Failed to fetch submission", error);
        }
      };
      fetchSubmission();
    }
  }, [id, user?.token]);

  const handleCheckboxChange = (event) => {
    setCheckedFindings({
      ...checkedFindings,
      [event.target.name]: event.target.checked,
    });
  };

  const handleSaveAndGenerate = async () => {
    setIsSaving(true);
    try {
      // 1. Create the annotationData array from the checked boxes
      const selectedLabels = Object.keys(checkedFindings).filter(
        (key) => checkedFindings[key]
      );
      const annotationData = selectedLabels.map((label) => ({
        label,
        shape: "checkbox",
      }));

      // 2. Save the findings. We'll use the front teeth image as the "annotated" image placeholder.
      const payload = {
        annotationData: annotationData,
        annotatedImageUrl: submission.frontTeethUrl,
      };
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`/api/admin/submissions/${id}/annotate`, payload, config);

      // 3. Immediately trigger the report generation
      await axios.post(`/api/admin/submissions/${id}/report`, {}, config);

      alert("Findings saved and report generated successfully!");
      navigate("/admin/dashboard");
    } catch (error) {
      console.error("Failed to save and generate report:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!submission) return <div>Loading...</div>;

  return (
    <div>
      <h2>Review & Report for {submission.patientInfo.name}</h2>
      <div style={{ display: "flex", gap: "2rem", marginTop: "2rem" }}>
        {/* Image Previews */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <h4>Upper Teeth</h4>
            <img
              src={submission.upperTeethUrl}
              alt="Upper Teeth"
              width="250"
              style={{ border: "1px solid #eee", borderRadius: "8px" }}
            />
          </div>
          <div>
            <h4>Front Teeth</h4>
            <img
              src={submission.frontTeethUrl}
              alt="Front Teeth"
              width="250"
              style={{ border: "1px solid #eee", borderRadius: "8px" }}
            />
          </div>
          <div>
            <h4>Lower Teeth</h4>
            <img
              src={submission.lowerTeethUrl}
              alt="Lower Teeth"
              width="250"
              style={{ border: "1px solid #eee", borderRadius: "8px" }}
            />
          </div>
        </div>

        {/* Findings Checklist */}
        <div style={{ flex: 1 }}>
          <h3>Select All Applicable Findings</h3>
          <div
            style={{
              border: "1px solid #eee",
              padding: "1rem",
              borderRadius: "8px",
            }}
          >
            {FINDING_TYPES.map((finding) => (
              <div key={finding} style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "1.1em",
                  }}
                >
                  <input
                    type="checkbox"
                    name={finding}
                    checked={!!checkedFindings[finding]}
                    onChange={handleCheckboxChange}
                    style={{
                      width: "20px",
                      height: "20px",
                      marginRight: "10px",
                    }}
                  />
                  {finding}
                </label>
                {checkedFindings[finding] && (
                  <p style={{ margin: "5px 0 0 30px", color: "#555" }}>
                    <strong>Recommendation:</strong>{" "}
                    {recommendationMap[finding] || "N/A"}
                  </p>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveAndGenerate}
            disabled={isSaving}
            style={{
              width: "100%",
              padding: "1rem",
              marginTop: "1rem",
              fontSize: "1.2em",
            }}
          >
            {isSaving ? "Processing..." : "Save Findings & Generate Report"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnotationPage;
