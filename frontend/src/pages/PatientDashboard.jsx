import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";

const PatientDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.get("/api/submissions/mine", config);
        setSubmissions(data);
      } catch (error) {
        console.error("Failed to fetch submissions", error);
      }
    };
    if (user?.token) {
      fetchSubmissions();
    }
  }, [user?.token]);

  return (
    <div>
      <h2>My Submissions</h2>
      <Link
        to="/upload"
        className="action-link"
        style={{ marginBottom: "1rem", display: "inline-block" }}
      >
        + New Submission
      </Link>
      <table>
        <thead>
          <tr>
            <th>Patient ID</th>
            <th>Submission Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => (
            <tr key={sub._id}>
              <td>{sub.patientInfo.patientId}</td>
              <td>{new Date(sub.createdAt).toLocaleDateString()}</td>
              <td>
                <span className={`status status-${sub.status}`}>
                  {sub.status}
                </span>
              </td>
              <td>
                {sub.status === "reported" ? (
                  <a
                    href={sub.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-link"
                  >
                    View Report
                  </a>
                ) : (
                  "N/A"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PatientDashboard;
