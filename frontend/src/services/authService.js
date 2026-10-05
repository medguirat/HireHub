import api from "./api";

/** Where each role lands after signing in (login or signup). */
export function dashboardFor(role) {
  if (role === "RECRUITER") return "/recruiter-dashboard";
  if (role === "CANDIDATE") return "/candidate-dashboard";
  return "/";
}

/**
 * After login or signup (the API has set the HttpOnly session cookie): loads the signed-in user
 * (with their profile) and keeps it for the pages. Login and signup both end here, so the
 * dashboards see the same session.
 */
async function startSession() {
  // The "session expired" notice stays (even across reloads) until the user signs in again.
  sessionStorage.removeItem("hirehub.sessionExpired");
  const user = (await api.get("/users/me")).data;
  localStorage.setItem("user", JSON.stringify(user));
  return user;
}

const authService = {
  /** Signs in and returns the user. */
  login: async (email, password) => {
    await api.post("/auth/login", { email, password });
    return startSession();
  },

  /**
   * Creates the account, already signed in (the API sets the session cookie). Returns the user,
   * or `{ accountCreated: true, user: null }` if the account exists but the session couldn't start
   * (the page then asks to log in instead of reporting a failed signup).
   */
  register: async (userData) => {
    await api.post("/auth/register", userData);
    try {
      return { accountCreated: true, user: await startSession() };
    } catch (err) {
      console.error("Signed up, but the session couldn't start:", err);
      localStorage.removeItem("user");
      return { accountCreated: true, user: null };
    }
  },

  getMe: async () => {
    const response = await api.get("/users/me");
    return response.data;
  },

  /** Ends the session: the API deletes the cookie (the page can't, it's HttpOnly). */
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    localStorage.clear();
  },

  // "Forgot password": the answer is the same whether or not the email has an account.
  requestPasswordReset: async (email) => (await api.post("/auth/password-reset", { email })).data,

  checkResetLink: async (token) => (await api.post("/auth/password-reset/check", { token })).data,

  resetPassword: async (token, password) => (await api.post("/auth/password-reset/confirm", { token, password })).data,
};

export default authService;
