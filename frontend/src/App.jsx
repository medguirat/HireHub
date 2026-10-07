import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import SplashScreen from "./pages/SplashScreen";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CreateAccount from "./pages/CreateAccount";
import RecruiterLayout from "./layouts/RecruiterLayout";
import RecruiterOverview from "./pages/RecruiterOverview";
import RecruiterOffers from "./pages/RecruiterOffers";
import CreateOffer from "./pages/CreateOffer";
import EditOffer from "./pages/EditOffer";
import RecruiterApplications from "./pages/RecruiterApplications";
import RecruiterStats from "./pages/RecruiterStats";
import RecruiterProfile from "./pages/RecruiterProfile";
import CandidateRating from "./pages/CandidateRating";
import OfferApplications from "./pages/OfferApplications";

// Candidate Layout & Pages
import CandidateLayout from "./layouts/CandidateLayout";
import CandidateOverview from "./pages/CandidateOverview";
import CandidateOffers from "./pages/CandidateOffers";
import CandidateApplications from "./pages/CandidateApplications";
import CandidateProfile from "./pages/CandidateProfile";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/create-account" element={<CreateAccount />} />
        
        {/* Recruiter Dashboard Nested Layout */}
        <Route element={<ProtectedRoute allowedRole="RECRUITER" />}>
          <Route path="/recruiter-dashboard" element={<RecruiterLayout />}>
            <Route index element={<RecruiterOverview />} />
            <Route path="offers" element={<RecruiterOffers />} />
            <Route path="offers/:id/applications" element={<OfferApplications />} />
            <Route path="create-offer" element={<CreateOffer />} />
            <Route path="edit-offer/:id" element={<EditOffer />} />
            <Route path="applications" element={<RecruiterApplications />} />
            <Route path="applications/:id/rate" element={<CandidateRating />} />
            <Route path="stats" element={<RecruiterStats />} />
            <Route path="profile" element={<RecruiterProfile />} />
          </Route>
        </Route>

        {/* Candidate Dashboard Nested Layout */}
        <Route element={<ProtectedRoute allowedRole="CANDIDATE" />}>
          <Route path="/candidate-dashboard" element={<CandidateLayout />}>
            <Route index element={<CandidateOverview />} />
            <Route path="offers" element={<CandidateOffers />} />
            <Route path="applications" element={<CandidateApplications />} />
            <Route path="profile" element={<CandidateProfile />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;