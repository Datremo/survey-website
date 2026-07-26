// File: src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

// We will build these components next
import Gateway from "./pages/Gateway";
import AdminDashboard from "./pages/admin/AdminDashboard";
import FormBuilder from "./pages/admin/FormBuilder";
import SurveyUserView from "./pages/survey/SurveyUserView";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. The Gateway: Split screen for Admin Login or entering a Code manually */}
        <Route path="/" element={<Gateway />} />

        {/* 2. Admin Routes: Protected area for creating and viewing stats */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/builder" element={<FormBuilder />} />
        
        {/* 3. The Public Shareable Link Route */}
        {/* If a user clicks yourwebsite.com/s/123, they land here instantly */}
        <Route path="/s/:surveyId" element={<SurveyUserView />} />
      </Routes>
    </BrowserRouter>
  );
}