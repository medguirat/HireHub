import api from "../api/axios";

const candidateService = {
  // Profile
  getProfile: () => api.get("/candidates/me"),
  updateProfile: (data) => api.put("/candidates/me", data),

  // Offers
  browseOffers: (params) => api.get("/candidates/offers", { params }),
  getOfferDetails: (id) => api.get(`/candidates/offers/${id}`),

  // Dashboard
  getDashboard: () => api.get("/candidates/dashboard"),

  // Applications
  getMyApplications: (params) => api.get("/applications", { params }),
  applyToOffer: (jobOfferId, cv, coverLetter) =>
    api.post("/applications", { jobOfferId, cv, coverLetter }),
  deleteApplication: (id) => api.delete(`/applications/${id}`),
};

export default candidateService;
