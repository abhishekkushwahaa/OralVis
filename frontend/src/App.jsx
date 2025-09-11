import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import AnnotationPage from "./pages/AnnotationPage.jsx";

function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<PatientDashboard />} />
            <Route path="/upload" element={<UploadPage />} />
          </Route>
          <Route element={<ProtectedRoute adminOnly={true} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/submission/:id" element={<AnnotationPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
