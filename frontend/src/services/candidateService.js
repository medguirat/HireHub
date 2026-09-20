import api from "./api";

const candidateService = {
  getDashboard: async () => {
    const response = await api.get("/candidates/dashboard");
    return response.data;
  },

  browseOffers: async (filters = {}) => {
    const { keyword, location, contractType, page = 0, size = 10 } = filters;
    let queryParams = [];
    if (keyword) queryParams.push(`keyword=${encodeURIComponent(keyword)}`);
    if (location) queryParams.push(`location=${encodeURIComponent(location)}`);
    if (contractType) queryParams.push(`contractType=${encodeURIComponent(contractType)}`);
    queryParams.push(`page=${page}`);
    queryParams.push(`size=${size}`);
    
    const queryString = queryParams.length ? `?${queryParams.join("&")}` : "";
    const response = await api.get(`/candidates/offers${queryString}`);
    return response.data;
  },

  getOfferById: async (id) => {
    const response = await api.get(`/candidates/offers/${id}`);
    return response.data;
  },

  createApplication: async (cv, coverLetter, jobOfferId) => {
    const response = await api.post("/applications", { cv, coverLetter, jobOfferId });
    return response.data;
  },

  getApplications: async (page = 0, size = 10) => {
    const response = await api.get(`/applications?page=${page}&size=${size}`);
    return response.data;
  },

  deleteApplication: async (id) => {
    const response = await api.delete(`/applications/${id}`);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get("/candidates/me");
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put("/candidates/me", profileData);
    return response.data;
  },

  updateBasicInfo: async (basicInfo) => {
    const response = await api.put("/users/me", basicInfo);
    return response.data;
  },

  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/files/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return response.data;
  },

  getNotifications: async () => {
    const response = await api.get("/notifications");
    return response.data;
  },

  markNotificationRead: async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  }
};

export default candidateService;
