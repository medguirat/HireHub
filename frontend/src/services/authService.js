import api from "./api";

const authService = {
  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    if (response.data && response.data.token) {
      localStorage.setItem("token", response.data.token);
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get("/users/me");
    return response.data;
  },

  logout: () => {
    localStorage.clear();
  },

  // "Forgot password": the answer is the same whether or not the email has an account.
  requestPasswordReset: async (email) => (await api.post("/auth/password-reset", { email })).data,

  checkResetLink: async (token) => (await api.post("/auth/password-reset/check", { token })).data,

  resetPassword: async (token, password) => (await api.post("/auth/password-reset/confirm", { token, password })).data,
};

export default authService;
