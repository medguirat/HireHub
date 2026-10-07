import api from "./api";
import { errorCode, errorMessage } from "../utils/apiError";

// Profile draft helpers ("write it for me"). CV/offer matching does NOT live here: it goes
// through candidateService.getOfferMatch.
//
// Both go through the backend, which asks the ai-service (the browser never calls the ai-service).
// Drafts are built only from what the user already entered. The ai-service may have an LLM reword
// them (then `ai_assisted` is true); there is no client-side fallback text, so nothing is ever
// made up here.

const unavailable = "The draft helper is unavailable right now. You can still write it yourself.";

async function draft(path, body) {
  try {
    const response = await api.post(path, body);
    return response.data; // { text, ai_assisted, used }
  } catch (err) {
    // "Add a few details first" is worth showing; anything else (service down, bad data) isn't.
    const message = errorCode(err) === "NOT_ENOUGH_DATA" ? errorMessage(err, unavailable) : unavailable;
    throw new Error(message, { cause: err });
  }
}

const aiService = {
  draftCompanyDescription: (company) => draft("/recruiters/profile/description-draft", company),
  draftBio: (candidate) => draft("/candidates/me/bio-draft", candidate),
};

export default aiService;
