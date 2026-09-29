#!/usr/bin/env node
// Fills HireHub with realistic demo data: companies, offers, candidates with
// CVs, and a few applications. Uses the public API, so every business rule
// applies. Safe to run repeatedly: existing data is detected and reused.
//
//   npm run seed        (backend and ai-service must be running: `npm run dev`)
//
// All demo accounts use the @demo.hirehub.test domain and the password below
// (override with DEMO_PASSWORD).

const API = process.env.HIREHUB_API_URL || "http://localhost:8081/api";
const PASSWORD = process.env.DEMO_PASSWORD || "Demo1234!";
const DOMAIN = "demo.hirehub.test";

// ---------------------------------------------------------------------------
// Demo content
// ---------------------------------------------------------------------------

const inDays = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const COMPANIES = [
  {
    user: { firstName: "Leila", lastName: "Mansour", email: `leila.mansour@${DOMAIN}` },
    profile: {
      companyName: "Novatech Solutions",
      website: "https://novatech-solutions.example",
      industry: "Software development",
      companySize: "51-200",
      companyType: "Software company",
      foundedYear: 2012,
      headquarters: "Tunis, Tunisia",
      description: "Novatech builds payment and banking software used by financial institutions across North Africa.",
      technologies: "Java, Spring Boot, React, PostgreSQL, Kubernetes",
    },
    offers: [
      {
        title: "Senior Java Backend Developer",
        location: "Tunis",
        contractType: "CDI",
        description: `We are looking for a Senior Java Backend Developer to join our payments team in Tunis.

Responsibilities:
- Design and build REST APIs and microservices with Java and Spring Boot
- Model and optimise PostgreSQL databases
- Containerise services with Docker and take part in code reviews

Requirements:
- 5+ years of experience in backend development
- Strong knowledge of Java 17, Spring Boot and Hibernate / JPA
- Solid SQL skills with PostgreSQL
- Experience with Docker and Git
- Master's degree or engineering degree in computer science
- Fluent English; French is a plus

Nice to have:
- Kubernetes
- AWS
- Kafka`,
      },
      {
        title: "React Frontend Developer",
        location: "Tunis (hybrid)",
        contractType: "CDI",
        description: `Build the web interfaces of our banking SaaS used by thousands of customers every day.

Responsibilities:
- Develop new features in React and TypeScript
- Turn Figma designs into accessible, responsive screens
- Integrate REST APIs with the backend team

Requirements:
- 3+ years of experience building web applications with React and TypeScript
- Strong HTML and CSS skills
- Experience consuming REST APIs
- Git and code reviews
- Good English

Nice to have:
- Next.js
- Jest or React Testing Library
- Figma`,
      },
      {
        title: "Développeur Java Spring Boot (H/F)",
        location: "Tunis",
        contractType: "CDI",
        description: `Nous recrutons un développeur Java confirmé pour notre équipe paiements à Tunis.

Missions :
- Concevoir et développer des API REST et des microservices en Java / Spring Boot
- Modéliser et optimiser les bases de données PostgreSQL
- Conteneuriser les services avec Docker

Profil recherché :
- 3 ans d'expérience minimum en développement backend
- Maîtrise de Java, Spring Boot et Hibernate / JPA
- Diplôme Bac+5 (école d'ingénieur ou master)
- Anglais courant

Atouts :
- Kubernetes
- Kafka`,
      },
      {
        title: "DevOps Engineer",
        location: "Tunis",
        contractType: "CDI",
        description: `Own the platform our 40 engineers deploy to.

Responsibilities:
- Run our Kubernetes clusters and CI/CD pipelines
- Automate infrastructure with Terraform
- Improve monitoring, security and cost

Requirements:
- 4+ years of experience in DevOps or site reliability
- Docker, Kubernetes and Linux administration
- CI/CD with GitLab CI or GitHub Actions
- Terraform
- Bachelor's degree in computer science or equivalent
- Professional English

Nice to have: AWS, Ansible`,
      },
    ],
  },
  {
    user: { firstName: "Omar", lastName: "Khelifi", email: `omar.khelifi@${DOMAIN}` },
    profile: {
      companyName: "DataSphere Analytics",
      website: "https://datasphere-analytics.example",
      industry: "Data & analytics consulting",
      companySize: "11-50",
      companyType: "Consulting",
      foundedYear: 2018,
      headquarters: "Sousse, Tunisia",
      description: "DataSphere helps retailers and banks turn their data into decisions with dashboards and machine learning.",
      technologies: "Python, SQL, Power BI, scikit-learn",
    },
    offers: [
      {
        title: "Data Analyst",
        location: "Sousse",
        contractType: "CDI",
        description: `Join our analytics team to turn sales data into decisions.

What you will do:
- Build dashboards in Power BI and maintain Excel reports
- Write SQL queries to analyse customer and sales data
- Present insights to business stakeholders

Requirements:
- 2+ years of experience in data analysis
- SQL, Python (pandas) and Power BI
- Bachelor's degree in statistics, economics or computer science
- Good English

Nice to have: Tableau, machine learning basics`,
      },
      {
        title: "Machine Learning Engineer",
        location: "Sousse (remote possible)",
        contractType: "CDD",
        description: `Build and ship the models behind our demand-forecasting product.

Responsibilities:
- Train and evaluate forecasting and classification models
- Put models in production behind APIs
- Work with data analysts on feature engineering

Requirements:
- 3+ years of experience in machine learning
- Python, scikit-learn and PyTorch or TensorFlow
- Strong SQL
- Master's degree in computer science, statistics or a related field
- Fluent English

Nice to have: Docker, FastAPI, Spark`,
      },
    ],
  },
  {
    user: { firstName: "Nadia", lastName: "Bouazizi", email: `nadia.bouazizi@${DOMAIN}` },
    profile: {
      companyName: "Atlas Retail Group",
      website: "https://atlas-retail.example",
      industry: "Retail",
      companySize: "201-500",
      companyType: "Retail chain",
      foundedYear: 2004,
      headquarters: "Sfax, Tunisia",
      description: "Atlas runs 60 stores and an online shop selling home and lifestyle products.",
      technologies: "Salesforce, Shopify, Google Analytics",
    },
    offers: [
      {
        title: "Digital Marketing Specialist",
        location: "Sfax",
        contractType: "CDI",
        description: `Grow our online sales through search, social and email.

Responsibilities:
- Plan and run Google Ads and social media campaigns
- Improve SEO for our online shop
- Write content for the blog, newsletters and product pages
- Report on campaign performance in Excel

Requirements:
- 2+ years of experience in digital marketing
- SEO and content writing
- Excel reporting
- Bachelor's degree in marketing or business
- Fluent French and good English`,
      },
      {
        title: "QA Test Engineer - Internship",
        location: "Sfax",
        contractType: "STAGE",
        description: `A six-month internship in our e-commerce team.

You will:
- Write test cases and run manual testing before each release
- Report bugs in Jira and test our APIs with Postman

Profile: student in computer science, curious and rigorous.
Nice to have: Selenium or Cypress.`,
      },
      {
        title: "Customer Support Team Lead",
        location: "Sfax",
        contractType: "CDI",
        description: `Lead a team of 8 advisers answering customers by phone, chat and email.

Requirements:
- 4+ years of experience in customer support, including team leadership
- Experience with a CRM such as Salesforce or HubSpot
- Fluent French and Arabic; good English`,
      },
    ],
  },
];

const CANDIDATES = [
  {
    user: { firstName: "Amine", lastName: "Trabelsi", email: `amine.trabelsi@${DOMAIN}` },
    profile: {
      bio: "Backend engineer building payment platforms with Java and Spring Boot.",
      skills: ["Java", "Spring Boot", "PostgreSQL", "Docker", "Kubernetes", "Kafka"],
      urlLinkedin: "https://www.linkedin.com/in/amine-trabelsi-demo",
      experiences: [
        { position: "Senior Backend Engineer", company: "FinPay", startDate: "2021-01-01", endDate: null },
        { position: "Backend Developer", company: "SoftBridge", startDate: "2017-09-01", endDate: "2020-12-31" },
      ],
    },
    cv: `Amine Trabelsi
Senior Backend Engineer - Tunis, Tunisia

Summary
Backend engineer with 7 years of experience building payment platforms and REST APIs in Java and Spring Boot.

Professional Experience
Senior Backend Engineer - FinPay, Tunis
Jan 2021 - Present
- Designed microservices with Java 17, Spring Boot and Hibernate for card payments
- Optimised PostgreSQL queries, cutting API latency by 40%
- Containerised services with Docker and deployed them on Kubernetes (AWS EKS)
- Introduced Kafka for event-driven settlement

Backend Developer - SoftBridge, Sousse
Sep 2017 - Dec 2020
- Built REST APIs with Spring MVC and JPA
- Wrote JUnit tests and set up CI/CD with GitLab CI

Education
Engineering degree in Computer Science - ENIT, 2012 - 2017

Skills
Java, Spring Boot, Hibernate, PostgreSQL, Docker, Kubernetes, AWS, Kafka, Git, JUnit

Languages
English: fluent (C1), French: fluent, Arabic: native`,
  },
  {
    user: { firstName: "Sarra", lastName: "Ben Salah", email: `sarra.bensalah@${DOMAIN}` },
    profile: {
      bio: "Java developer who enjoys building web applications.",
      skills: ["Java", "Spring", "MySQL", "HTML", "CSS"],
      experiences: [{ position: "Java Developer", company: "WebCraft", startDate: "2024-03-01", endDate: null }],
    },
    cv: `Sarra Ben Salah
Java Developer - Sfax, Tunisia

Profile
Java developer who enjoys building web applications.

Experience
Java Developer - WebCraft, Sfax
Mar 2024 - Present
- Developed features for an e-commerce platform using Java and Spring
- Wrote SQL queries on MySQL
- Built responsive pages with HTML and CSS

Education
Licence (Bachelor's degree) in Computer Science - ISIMS, 2018 - 2021

Skills
Java, Spring, MySQL, HTML, CSS, Git

Languages
English (B1), French (B2), Arabic (native)`,
  },
  {
    user: { firstName: "Yasmine", lastName: "Gharbi", email: `yasmine.gharbi@${DOMAIN}` },
    profile: {
      bio: "Data analyst turning sales and customer data into dashboards and recommendations.",
      skills: ["SQL", "Python", "Power BI", "Excel", "Tableau"],
      experiences: [{ position: "Data Analyst", company: "RetailCo", startDate: "2022-02-01", endDate: null }],
    },
    cv: `Yasmine Gharbi
Data Analyst - Tunis, Tunisia

Summary
Data analyst turning sales and customer data into dashboards and recommendations for business teams.

Experience
Data Analyst - RetailCo, Tunis
Feb 2022 - Present
- Built Power BI dashboards used weekly by the sales directors
- Wrote SQL queries and Python (pandas) notebooks to analyse customer churn
- Automated monthly Excel reports with VBA

Education
Master's degree in Statistics - ISG Tunis, 2019 - 2021

Skills
SQL, Python, pandas, Power BI, Excel, Tableau, statistics

Languages
English (C1), French (fluent), Arabic (native)`,
  },
  {
    user: { firstName: "Mehdi", lastName: "Jaziri", email: `mehdi.jaziri@${DOMAIN}` },
    profile: {
      bio: "Frontend developer focused on accessible React interfaces.",
      skills: ["React", "TypeScript", "CSS", "Next.js", "Jest"],
      urlGithub: "https://github.com/mehdi-jaziri-demo",
      experiences: [
        { position: "Frontend Developer", company: "PixelWave", startDate: "2022-06-01", endDate: null },
        { position: "Web Developer (freelance)", company: "Freelance", startDate: "2020-09-01", endDate: "2022-05-31" },
      ],
    },
    cv: `Mehdi Jaziri
Frontend Developer - Tunis, Tunisia

Summary
Frontend developer with 5 years of experience building fast, accessible web apps with React and TypeScript.

Experience
Frontend Developer - PixelWave, Tunis
Jun 2022 - Present
- Built a design system in React and TypeScript used by 4 product teams
- Migrated the marketing site to Next.js, improving load time by 35%
- Integrated REST APIs and wrote Jest and React Testing Library tests

Web Developer (freelance)
Sep 2020 - May 2022
- Delivered 12 websites with HTML, CSS and JavaScript from Figma mockups

Education
Bachelor's degree in Computer Science - ISI Ariana, 2017 - 2020

Skills
React, TypeScript, JavaScript, Next.js, HTML, CSS, Jest, Git, Figma

Languages
French (fluent), English (B2), Arabic (native)`,
  },
  {
    user: { firstName: "Nour", lastName: "Hammami", email: `nour.hammami@${DOMAIN}` },
    profile: {
      bio: "Développeuse backend Java / Spring Boot, spécialisée dans les systèmes de paiement.",
      skills: ["Java", "Spring Boot", "PostgreSQL", "Docker", "Kubernetes"],
      experiences: [
        { position: "Développeuse Java Senior", company: "BankTech", startDate: "2021-01-01", endDate: null },
        { position: "Développeuse Java", company: "SoftCom", startDate: "2018-09-01", endDate: "2020-12-31" },
      ],
    },
    cv: `Nour Hammami
Développeuse Java Senior - Tunis, Tunisie

Profil
Développeuse backend avec 6 ans d'expérience dans la conception d'API REST et de microservices en Java et Spring Boot.

Expérience professionnelle
Développeuse Java Senior - BankTech, Tunis
janv. 2021 - présent
- Conception de microservices Java 17 / Spring Boot pour les paiements par carte
- Optimisation des requêtes PostgreSQL, latence réduite de 35 %
- Conteneurisation avec Docker et déploiement sur Kubernetes
- Intégration continue avec GitLab CI, méthodes agiles (Scrum)

Développeuse Java - SoftCom, Sfax
sept. 2018 - déc. 2020
- Développement d'API REST avec Spring MVC et JPA, tests unitaires avec JUnit

Formation
Ingénieur en informatique - ENIS, 2013 - 2018

Compétences
Java, Spring Boot, Hibernate, PostgreSQL, Docker, Kubernetes, Git

Langues
Français : courant, Anglais : bon niveau, Arabe : langue maternelle`,
  },
  {
    user: { firstName: "Ines", lastName: "Chaabane", email: `ines.chaabane@${DOMAIN}` },
    profile: {
      bio: "Digital marketer growing e-commerce brands through SEO and paid social.",
      skills: ["SEO", "Google Ads", "Content writing", "Excel"],
      experiences: [{ position: "Digital Marketing Officer", company: "ShopNow", startDate: "2023-01-01", endDate: null }],
    },
    cv: `Ines Chaabane
Digital Marketing Officer - Sfax, Tunisia

Summary
Digital marketer growing e-commerce brands through SEO, paid social and content.

Experience
Digital Marketing Officer - ShopNow, Sfax
Jan 2023 - Present
- Ran Google Ads and Facebook Ads campaigns with a monthly budget of 15,000 TND
- Improved SEO rankings, doubling organic traffic in 12 months
- Wrote blog posts and newsletters (content writing)
- Reported campaign results in Excel dashboards

Education
Bachelor's degree in Marketing - IHEC Sfax, 2019 - 2022

Skills
SEO, digital marketing, Google Ads, content writing, Excel, social media marketing

Languages
French (fluent), Arabic (native), English (good)`,
  },
];

// candidate email -> [offer title, status after the recruiter's decision]
const APPLICATIONS = [
  [`amine.trabelsi@${DOMAIN}`, "Senior Java Backend Developer", "ACCEPTED"],
  [`sarra.bensalah@${DOMAIN}`, "Senior Java Backend Developer", "PENDING"],
  [`sarra.bensalah@${DOMAIN}`, "React Frontend Developer", "PENDING"],
  [`mehdi.jaziri@${DOMAIN}`, "React Frontend Developer", "PENDING"],
  [`yasmine.gharbi@${DOMAIN}`, "Data Analyst", "ACCEPTED"],
  [`yasmine.gharbi@${DOMAIN}`, "Machine Learning Engineer", "REJECTED"],
  [`ines.chaabane@${DOMAIN}`, "Digital Marketing Specialist", "PENDING"],
];

// ---------------------------------------------------------------------------
// Minimal single-page PDF writer (Helvetica, WinAnsi) so the CVs are real PDFs
// ---------------------------------------------------------------------------

function wrap(text, width = 92) {
  const lines = [];
  for (const raw of text.split("\n")) {
    let line = raw;
    while (line.length > width) {
      const cut = line.lastIndexOf(" ", width);
      lines.push(line.slice(0, cut > 0 ? cut : width));
      line = line.slice(cut > 0 ? cut + 1 : width);
    }
    lines.push(line);
  }
  return lines;
}

function makePdf(text) {
  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const stream = "BT /F1 10.5 Tf 50 790 Td 14 TL " + wrap(text).map((l) => `(${esc(l)}) '`).join(" ") + " ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function call(method, path, { token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  const response = await fetch(`${API}${path}`, { method, headers, body: json ? JSON.stringify(json) : form });
  const text = await response.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch { /* plain text body */ }
  return { status: response.status, data };
}

function expectOk(result, what) {
  if (result.status >= 200 && result.status < 300) return result.data;
  const detail = typeof result.data === "string" ? result.data : JSON.stringify(result.data);
  throw new Error(`${what} failed (${result.status}): ${detail}`);
}

async function allPages(path, token) {
  const items = [];
  for (let page = 0; ; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const data = expectOk(await call("GET", `${path}${sep}page=${page}&size=100`, { token }), `GET ${path}`);
    items.push(...(data.content || []));
    if (page + 1 >= (data.totalPages || 0)) return items;
  }
}

const counts = { created: 0, reused: 0 };
const note = (created, message) => {
  counts[created ? "created" : "reused"] += 1;
  console.log(`  ${created ? "+" : "="} ${message}`);
};

async function ensureUser(user, role) {
  let login = await call("POST", "/auth/login", { json: { email: user.email, password: PASSWORD } });
  if (login.status === 200) {
    note(false, `${role.toLowerCase()} ${user.email}`);
  } else {
    expectOk(await call("POST", "/users", { json: { ...user, password: PASSWORD, role } }), `Create ${user.email}`);
    login = await call("POST", "/auth/login", { json: { email: user.email, password: PASSWORD } });
    expectOk(login, `Log in as ${user.email}`);
    note(true, `${role.toLowerCase()} ${user.email}`);
  }
  return login.data.token;
}

function pdfForm(fileName, text) {
  const form = new FormData();
  form.append("file", new Blob([makePdf(text)], { type: "application/pdf" }), fileName);
  return form;
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

async function seedCompany(company) {
  const token = await ensureUser(company.user, "RECRUITER");
  expectOk(await call("PUT", "/recruiters/profile", { token, json: company.profile }), "Update company profile");
  const existing = new Set((await allPages("/recruiters/offers", token)).map((o) => o.title));
  for (const offer of company.offers) {
    if (existing.has(offer.title)) {
      note(false, `offer "${offer.title}"`);
      continue;
    }
    expectOk(await call("POST", "/recruiters/offers", { token, json: { ...offer, deadline: inDays(60) } }),
      `Create offer ${offer.title}`);
    note(true, `offer "${offer.title}" (${company.profile.companyName})`);
  }
  return token;
}

async function seedCandidate(candidate) {
  const token = await ensureUser(candidate.user, "CANDIDATE");
  expectOk(await call("PUT", "/candidates/me", { token, json: candidate.profile }), "Update candidate profile");
  const fileName = `CV-${candidate.user.firstName}-${candidate.user.lastName.replace(/\s+/g, "")}.pdf`;
  const stored = await call("GET", "/candidates/me/cv", { token });
  if (stored.status === 200) {
    note(false, `CV of ${candidate.user.firstName}`);
  } else {
    expectOk(await call("PUT", "/candidates/me/cv", { token, form: pdfForm(fileName, candidate.cv) }),
      `Upload CV of ${candidate.user.email}`);
    note(true, `CV ${fileName}`);
  }
  return { token, fileName };
}

// Demo applications must only ever target the demo companies' offers, never an
// offer with the same title that already exists in the database.
const COMPANY_BY_OFFER = Object.fromEntries(
  COMPANIES.flatMap((c) => c.offers.map((o) => [o.title, c.profile.companyName]))
);

async function seedApplications(candidateSessions, recruiterTokenByOffer) {
  for (const [email, title, finalStatus] of APPLICATIONS) {
    const { token, fileName, cv } = candidateSessions[email];
    const company = COMPANY_BY_OFFER[title];
    const mine = await allPages("/applications", token);
    let application = mine.find((a) => a.jobOfferTitle === title && a.recruiterCompany === company);
    if (application) {
      note(false, `application ${email} -> ${title}`);
    } else {
      const results = await allPages(`/candidates/offers?keyword=${encodeURIComponent(title)}`, token);
      const offer = results.find((o) => o.title === title && o.companyName === company);
      if (!offer) throw new Error(`Offer "${title}" of ${company} not found`);
      const upload = expectOk(await call("POST", "/files/upload", { token, form: pdfForm(fileName, cv) }), "Upload application CV");
      application = expectOk(await call("POST", "/applications", {
        token,
        json: { jobOfferId: offer.id, cv: upload.url, coverLetter: `I would love to bring my experience to the ${title} role.` },
      }), `Apply to ${title}`);
      note(true, `application ${email} -> ${title}`);
    }

    if (finalStatus !== "PENDING" && application.status === "PENDING") {
      const decision = finalStatus === "ACCEPTED"
        ? { status: "ACCEPTED", interviewDate: `${inDays(7)}T10:00:00` }
        : { status: "REJECTED" };
      expectOk(await call("PATCH", `/applications/${application.id}/status`,
        { token: recruiterTokenByOffer[title], json: decision }), `Set ${finalStatus} on ${title}`);
      note(true, `decision ${finalStatus} for ${email} -> ${title}`);
    }
  }
}

async function main() {
  const health = await fetch(`${API}/health`).then((r) => r.json()).catch(() => null);
  if (!health) {
    throw new Error(`Backend not reachable at ${API}. Start everything with \`npm run dev\` first.`);
  }
  if (health.aiService?.status !== "UP") {
    console.log("! ai-service is not up yet: CVs will be stored and their text extracted on first match.");
  }

  console.log("Companies and offers");
  const recruiterTokenByOffer = {};
  for (const company of COMPANIES) {
    const token = await seedCompany(company);
    company.offers.forEach((offer) => { recruiterTokenByOffer[offer.title] = token; });
  }

  console.log("Candidates and CVs");
  const sessions = {};
  for (const candidate of CANDIDATES) {
    sessions[candidate.user.email] = { ...(await seedCandidate(candidate)), cv: candidate.cv };
  }

  console.log("Applications");
  await seedApplications(sessions, recruiterTokenByOffer);

  console.log(`\nDone: ${counts.created} created, ${counts.reused} already present.`);
  console.log(`Log in with any @${DOMAIN} account, password: ${PASSWORD}`);
}

main().catch((err) => {
  console.error(`\nSeeding failed: ${err.message}`);
  process.exitCode = 1;
});
