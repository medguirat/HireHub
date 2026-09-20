import api from "./api";

const recruiterService = {
  createOffer: async (offerData) => {
    const response = await api.post("/recruiters/offers", offerData);
    return response.data;
  },

  getOffers: async (page = 0, size = 10) => {
    const response = await api.get(`/recruiters/offers?page=${page}&size=${size}`);
    return response.data;
  },

  getOfferById: async (id) => {
    const response = await api.get(`/recruiters/offers/${id}`);
    return response.data;
  },

  updateOffer: async (id, offerData) => {
    const response = await api.put(`/recruiters/offers/${id}`, offerData);
    return response.data;
  },

  deleteOffer: async (id) => {
    const response = await api.delete(`/recruiters/offers/${id}`);
    return response.data;
  },

  getApplications: async (page = 0, size = 100) => {
    const response = await api.get(`/applications?page=${page}&size=${size}`);
    return response.data;
  },

  getApplicationById: async (id) => {
    const response = await api.get(`/applications/${id}`);
    return response.data;
  },

  updateApplicationStatus: async (id, statusData) => {
    const body = typeof statusData === "string" ? { status: statusData } : statusData;
    const response = await api.patch(`/applications/${id}/status`, body);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get("/recruiters/profile");
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put("/recruiters/profile", profileData);
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
  }
};

export default recruiterService;
