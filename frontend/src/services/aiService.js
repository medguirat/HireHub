import axios from "axios";

// CV/offer matching does NOT live here: it goes through the backend
// (candidateService.getOfferMatch) and has no client-side fallback score.
// This client only serves the profile bio helper.

const AI_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";

const aiClient = axios.create({
  baseURL: AI_BASE_URL,
  timeout: 8000
});

// Used only to list skills in the offline bio template below.
const KNOWN_SKILLS = [
  "python", "java", "spring boot", "spring", "react", "react.js", "docker", "kubernetes",
  "postgresql", "mysql", "redis", "aws", "azure", "gcp",
  "typescript", "javascript", "node.js", "rest api", "graphql",
  "sql", "git", "agile", "scrum", "machine learning", "ai",
  "html", "css", "flutter", "android", "ios", "django", "devops",
  "tailwind", "next.js", "nest.js", "mongodb", "ci/cd", "c++", "c#", ".net",
  "software engineering", "backend", "frontend", "fullstack", "microservices"
];

const aiService = {
  /**
   * Generate (or improve) a candidate/company bio via the ai-service
   * template endpoint; falls back to the same template locally.
   */
  generateBio: async (title, skills = [], text = "") => {
    try {
      const response = await aiClient.post("/analyze/bio", {
        title: title || "",
        skills: skills || [],
        text: text || ""
      });
      return { ...response.data, source: "ai-service" };
    } catch (err) {
      console.warn("[aiService] ai-service unreachable, using local bio template:", err.message);
      return { ...aiService.fallbackGenerateBio(title, skills, text), source: "fallback" };
    }
  },

  fallbackExtractSkills: (text) => {
    if (!text) return [];
    const lower = text.toLowerCase();
    const found = KNOWN_SKILLS.filter((skill) => {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${escaped}\\b`, "i").test(lower);
    });
    return Array.from(new Set(found));
  },

  fallbackGenerateBio: (title, skills = [], text = "") => {
    const extracted = text ? aiService.fallbackExtractSkills(text) : [];
    const allSkills = Array.from(new Set([...skills, ...extracted]));
    const skillsStr = allSkills.length > 0 ? allSkills.join(", ") : "software development, problem solving, modern tools";
    const role = (title || "").trim() || "Passionate Professional";

    const generated_bio =
      `Dynamic and results-oriented ${role} skilled in ${skillsStr}. ` +
      `Experienced in building high-performance solutions, collaborating with cross-functional teams, ` +
      `and continuously learning cutting-edge technologies to drive impactful results.`;

    return { generated_bio, extracted_skills: allSkills };
  }
};

export default aiService;
