import axios from "axios";
import { apiError, errorCode, errorMessage } from "../utils/apiError";

// Profile draft helpers. CV/offer matching does NOT live here: it goes
// through the backend (candidateService.getOfferMatch).
//
// Drafts are built only from what the user already entered. The ai-service
// may have an LLM reword them (then `ai_assisted` is true); there is no
// client-side fallback text, so nothing is ever made up here.

const AI_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";

const aiClient = axios.create({
  baseURL: AI_BASE_URL,
  timeout: 30000
});

const unavailable = "The draft helper is unavailable right now. You can still write it yourself.";

async function draft(path, body) {
  try {
    const response = await aiClient.post(path, body);
    return response.data; // { text, ai_assisted, used }
  } catch (err) {
    // The ai-service's own errors (e.g. "add a few details first") are worth showing; anything else isn't.
    const message = apiError(err) && errorCode(err) !== "VALIDATION_FAILED" && err.response.status < 500
      ? errorMessage(err, unavailable) : unavailable;
    throw new Error(message, { cause: err });
  }
}

const aiService = {
  draftCompanyDescription: (company) => draft("/draft/company", company),
  draftBio: (candidate) => draft("/draft/bio", candidate),
};

export default aiService;
