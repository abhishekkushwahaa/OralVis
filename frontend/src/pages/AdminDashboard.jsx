import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";

const AdminDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const { user } = useContext(AuthContext);
  const API_URL = import.meta.env.VITE_API_URL;
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.get(
          `${API_URL}/api/admin/submissions`,
          config
        );
        setSubmissions(data);
      } catch (error) {
        console.error("Failed to fetch submissions", error);
      }
    };
    fetchSubmissions();
  }, [user.token]);

  return (
    <div>
      <h2>All Patient Submissions</h2>
      <table>
        <thead>
          <tr>
            <th>Patient Name</th>
            <th>Submission Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => (
            <tr key={sub._id}>
              <td>{sub.patientInfo.name}</td>
              <td>{new Date(sub.createdAt).toLocaleDateString()}</td>
              <td>
                <span className={`status status-${sub.status}`}>
                  {sub.status}
                </span>
              </td>
              <td>
                <Link
                  to={`/admin/submission/${sub._id}`}
                  className="action-link"
                >
                  View & Annotate
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
