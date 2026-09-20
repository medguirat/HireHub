import axios from "axios";

const AI_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";

const aiClient = axios.create({
  baseURL: AI_BASE_URL,
  timeout: 8000
});

// Built-in skills dictionary for client-side matching engine (fallback only)
const KNOWN_SKILLS = [
  "python", "java", "spring boot", "spring", "react", "react.js", "docker", "kubernetes",
  "postgresql", "mysql", "redis", "aws", "azure", "gcp",
  "typescript", "javascript", "node.js", "rest api", "graphql",
  "sql", "git", "agile", "scrum", "machine learning", "ai",
  "html", "css", "flutter", "android", "ios", "django", "devops",
  "tailwind", "next.js", "nest.js", "mongodb", "ci/cd", "c++", "c#", ".net",
  "software engineering", "backend", "frontend", "fullstack", "microservices"
];

// Learning resources database for roadmaps (fallback only)
const ROADMAP_RESOURCES = {
  docker: { action: "Master Containerization with Docker", resource: "Docker Docs & freeCodeCamp Guide", duration: "2 weeks" },
  kubernetes: { action: "Learn Orchestration with Kubernetes", resource: "Kubernetes Basics (k8s.io)", duration: "3 weeks" },
  aws: { action: "Gain Cloud Expertise on AWS", resource: "AWS Skill Builder & Cloud Practitioner", duration: "3 weeks" },
  react: { action: "Build Modern Web Interfaces with React", resource: "React.dev Interactive Tutorial", duration: "2 weeks" },
  "spring boot": { action: "Build Enterprise APIs with Spring Boot", resource: "Spring.io Guides & Baeldung", duration: "3 weeks" },
  java: { action: "Master Core Java & Enterprise Backend Architecture", resource: "Oracle Java Documentation & Baeldung", duration: "2 weeks" },
  python: { action: "Deepen Python Programming & Data Structures", resource: "Official Python Documentation", duration: "2 weeks" },
  postgresql: { action: "Learn Relational Database Design & SQL", resource: "PostgreSQL Tutorial & Practice", duration: "1 week" },
  typescript: { action: "Master Static Typing with TypeScript", resource: "TypeScript Handbook", duration: "1 week" },
  default: (skill) => ({ action: `Build a project or complete a course in ${skill}`, resource: `Search ${skill} tutorials on Coursera / YouTube`, duration: "2 weeks" })
};

const aiService = {
  /**
   * Analyze match between CV/candidate profile and job offer description.
   * Tries the real ai-service (FastAPI) first; only falls back to the local
   * JS heuristic if the service is genuinely unreachable, and says so in
   * the console so it's obvious which one actually ran.
   */
  analyzeMatch: async (cvText, offerText, candidateSkills = [], requiredSkills = []) => {
    try {
      const response = await aiClient.post("/analyze/match", {
        cv_text: cvText || "",
        offer_text: offerText || "",
        candidate_skills: candidateSkills,
        required_skills: requiredSkills
      });
      return { ...response.data, source: "ai-service" };
    } catch (err) {
      console.warn("[aiService] ai-service unreachable, using local fallback matching:", err.message);
      return { ...aiService.fallbackMatch(cvText, offerText, candidateSkills, requiredSkills), source: "fallback" };
    }
  },

  /**
   * Extract skills and experience level from job offer text
   */
  extractOfferInfo: async (title, description) => {
    try {
      const response = await aiClient.post("/analyze/offer", {
        title: title || "",
        description: description || ""
      });
      return response.data;
    } catch (err) {
      return aiService.fallbackExtractOfferInfo(title, description);
    }
  },

  /**
   * Generate (or improve) a candidate/company bio via the ai-service LLM
   * endpoint. THIS WAS MISSING ENTIRELY BEFORE — CandidateProfile.jsx and
   * RecruiterProfile.jsx both call aiService.generateBio(...), which used to
   * throw "aiService.generateBio is not a function" and get swallowed by
   * the surrounding try/catch (shown to the user as a generic error).
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
      console.warn("[aiService] ai-service unreachable, using local fallback bio:", err.message);
      return { ...aiService.fallbackGenerateBio(title, skills, text), source: "fallback" };
    }
  },

  /**
   * Extract skills from any arbitrary text
   */
  fallbackExtractSkills: (text) => {
    if (!text) return [];
    const lower = text.toLowerCase();
    const found = [];

    KNOWN_SKILLS.forEach(skill => {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lower) || lower.includes(skill.toLowerCase())) {
        found.push(skill);
      }
    });

    return Array.from(new Set(found));
  },

  fallbackExtractOfferInfo: (title, description) => {
    const combined = `${title || ""} ${description || ""}`;
    const skills = aiService.fallbackExtractSkills(combined);

    const titleLower = (title || "").toLowerCase();
    if (titleLower.includes("java") && !skills.includes("java")) skills.push("java");
    if (titleLower.includes("react") && !skills.includes("react")) skills.push("react");
    if (titleLower.includes("python") && !skills.includes("python")) skills.push("python");
    if (titleLower.includes("fullstack") && !skills.includes("fullstack")) skills.push("fullstack");

    let experience_level = "Mid-Level";
    const lower = combined.toLowerCase();
    if (lower.includes("senior") || lower.includes("lead") || lower.includes("5+") || lower.includes("7+")) {
      experience_level = "Senior / Executive";
    } else if (lower.includes("junior") || lower.includes("intern") || lower.includes("entry") || lower.includes("stage")) {
      experience_level = "Junior / Entry Level";
    }

    return { skills, category: "Software Development", experience_level };
  },

  /**
   * Local template-based bio, used only when the ai-service is unreachable.
   */
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
  },

  /**
   * Smart Fallback Matching Engine evaluating full CV content + profile skills vs Job Offer
   */
  fallbackMatch: (cvText, offerText, candidateSkills = [], requiredSkills = []) => {
    const cvCombined = `${cvText || ""} ${(candidateSkills || []).join(" ")}`.toLowerCase();
    const offerCombined = `${offerText || ""} ${(requiredSkills || []).join(" ")}`.toLowerCase();

    let reqSkills = requiredSkills.length > 0 ? requiredSkills : aiService.fallbackExtractSkills(offerText);
    if (reqSkills.length === 0) {
      reqSkills = ["Software Development", "Problem Solving", "Teamwork"];
    }

    const candExtractedSkills = aiService.fallbackExtractSkills(cvCombined);
    const allCandSkills = Array.from(new Set([
      ...candidateSkills.map(s => String(s).toLowerCase()),
      ...candExtractedSkills.map(s => String(s).toLowerCase())
    ]));

    const matchedSkills = [];
    const missingSkills = [];

    reqSkills.forEach(req => {
      const reqLower = req.toLowerCase();
      const isMatched = allCandSkills.some(cand => {
        return cand === reqLower || cand.includes(reqLower) || reqLower.includes(cand);
      }) || cvCombined.includes(reqLower);

      if (isMatched) {
        matchedSkills.push(req);
      } else {
        missingSkills.push(req);
      }
    });

    const skillRatio = reqSkills.length > 0 ? matchedSkills.length / reqSkills.length : 0.8;
    let skillScore = Math.round(skillRatio * 100);

    let keywordBonus = 0;
    const words = cvCombined.split(/\W+/).filter(w => w.length > 3);
    if (words.length > 0) {
      const hits = words.filter(w => offerCombined.includes(w)).length;
      keywordBonus = Math.min(25, Math.round((hits / words.length) * 45));
    }

    const hasTechBackground = cvCombined.includes("engineer") || cvCombined.includes("developer") || cvCombined.includes("software") || cvCombined.includes("computer") || cvCombined.includes("cv") || cvCombined.includes("experience");

    let baseScore = hasTechBackground ? 45 : 30;
    let finalScore = Math.round((skillScore * 0.65) + (keywordBonus * 0.2) + (baseScore * 0.15));

    if (matchedSkills.length > 0 && matchedSkills.length >= missingSkills.length) {
      finalScore = Math.max(72, finalScore);
    }

    finalScore = Math.min(96, Math.max(40, finalScore));

    const recommendations = [];
    if (missingSkills.length > 0) {
      recommendations.push(`Ajoutez des réalisations concrètes sur ${missingSkills.slice(0, 3).join(", ")} dans la section Expériences de votre CV.`);
    } else {
      recommendations.push("Votre CV couvre l'ensemble des compétences clés requises pour cette offre!");
    }

    if (cvCombined.length < 300) {
      recommendations.push("Enrichissez votre CV en détaillant vos projets académiques et professionnels majeurs.");
    } else {
      recommendations.push("Valorisez les résultats quantifiables (ex: optimisation de 25% de la rapidité d'exécution, gestion de bases de données).");
    }

    recommendations.push("Structurez votre CV avec des mots-clés techniques précis pour optimiser le filtrage ATS du recruteur.");

    const roadmap = missingSkills.map(skill => {
      const info = ROADMAP_RESOURCES[skill.toLowerCase()] || ROADMAP_RESOURCES.default(skill);
      return {
        skill,
        action: info.action,
        ressource: info.resource,
        duree_semaines: info.duration
      };
    });

    return {
      compatibility_score: finalScore,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      recommendations,
      roadmap
    };
  }
};

export default aiService;
