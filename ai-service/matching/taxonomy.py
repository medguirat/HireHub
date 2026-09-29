"""Reference data the parser normalizes against.

Skills: each canonical skill has a display name and the aliases that count as
the same skill ("JS" == JavaScript). Two kinds of relationship exist between
skills:
  implies  having the skill proves knowledge of another one
           (Spring Boot => Spring, TypeScript => JavaScript): full credit.
  related  neighbouring skills that transfer partially
           (Spring ~ Spring Boot, MySQL ~ PostgreSQL): partial credit.

An alias starting with "re:" is a raw regular expression, used where a plain
word would be ambiguous (e.g. "spring" the season).
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Skill:
    display: str
    aliases: tuple
    implies: tuple = field(default_factory=tuple)
    related: tuple = field(default_factory=tuple)


def _s(display, aliases, implies=(), related=()):
    return Skill(display, tuple(aliases), tuple(implies), tuple(related))


SKILLS = {
    # ---- Programming languages -------------------------------------------
    "java": _s("Java", ["java", "java 8", "java 11", "java 17", "java 21", "java ee", "jakarta ee", "j2ee"]),
    "javascript": _s("JavaScript", ["javascript", "js", "ecmascript", "es6", "vanilla js"]),
    "typescript": _s("TypeScript", ["typescript", "ts"], implies=["javascript"]),
    "python": _s("Python", ["python", "python3", "python 3"]),
    "c#": _s("C#", ["c#", "csharp", "c sharp"], related=[".net"]),
    "c++": _s("C++", ["c++", "cpp"], related=["c"]),
    "c": _s("C", ["re:\\bc programming\\b", "re:\\blangage c\\b", "re:\\bansi c\\b", "re:\\bc/c\\+\\+"], related=["c++"]),
    "php": _s("PHP", ["php", "php 8"]),
    "go": _s("Go", ["golang", "re:\\bgo \\(golang\\)", "re:\\bgo language\\b"]),
    "rust": _s("Rust", ["re:\\brust\\b(?! ?proof)"]),
    "kotlin": _s("Kotlin", ["kotlin"], related=["java"]),
    "swift": _s("Swift", ["swift", "swiftui"]),
    "dart": _s("Dart", ["dart"]),
    "ruby": _s("Ruby", ["ruby"]),
    "scala": _s("Scala", ["scala"]),
    "r": _s("R", ["re:\\br programming\\b", "re:\\blangage r\\b", "rstudio"]),
    "matlab": _s("MATLAB", ["matlab"]),
    "sql": _s("SQL", ["sql", "t-sql", "pl/sql", "plsql", "bases de données relationnelles",
                      "base de données relationnelle", "sgbdr"]),
    "bash": _s("Bash / Shell", ["bash", "shell scripting", "shell script"]),
    "html": _s("HTML", ["html", "html5"]),
    "css": _s("CSS", ["css", "css3", "scss", "sass"]),

    # ---- Backend frameworks ----------------------------------------------
    "spring": _s("Spring", ["spring framework", "spring mvc", "spring security", "spring data",
                            "re:\\bspring\\b(?! ?(20\\d\\d|19\\d\\d|semester|term|break))"],
                 implies=["java"], related=["spring boot"]),
    "spring boot": _s("Spring Boot", ["spring boot", "springboot", "spring-boot"], implies=["spring", "java"]),
    "hibernate": _s("Hibernate / JPA", ["hibernate", "jpa", "spring data jpa"], implies=["java"]),
    "node.js": _s("Node.js", ["node.js", "nodejs", "node js"], implies=["javascript"]),
    "express": _s("Express.js", ["express.js", "expressjs", "express js"], implies=["node.js"]),
    "nestjs": _s("NestJS", ["nestjs", "nest.js"], implies=["node.js", "typescript"]),
    "django": _s("Django", ["django", "django rest framework", "drf"], implies=["python"], related=["flask", "fastapi"]),
    "flask": _s("Flask", ["flask"], implies=["python"], related=["django", "fastapi"]),
    "fastapi": _s("FastAPI", ["fastapi"], implies=["python"], related=["flask", "django"]),
    ".net": _s(".NET", [".net", "dotnet", "asp.net", ".net core", "asp.net core"], related=["c#"]),
    "laravel": _s("Laravel", ["laravel"], implies=["php"], related=["symfony"]),
    "symfony": _s("Symfony", ["symfony"], implies=["php"], related=["laravel"]),
    "rest api": _s("REST APIs", ["rest api", "rest apis", "restful", "rest services", "api rest", "apis rest",
                                 "web services", "webservices", "services web", "service web"]),
    "graphql": _s("GraphQL", ["graphql"]),
    "microservices": _s("Microservices", ["microservices", "microservice", "micro-services", "microservice architecture"]),
    "kafka": _s("Kafka", ["kafka", "apache kafka"], related=["rabbitmq"]),
    "rabbitmq": _s("RabbitMQ", ["rabbitmq"], related=["kafka"]),

    # ---- Frontend ---------------------------------------------------------
    "react": _s("React", ["react", "react.js", "reactjs", "react js", "react hooks"], implies=["javascript"],
                related=["vue", "angular"]),
    "next.js": _s("Next.js", ["next.js", "nextjs"], implies=["react"]),
    "angular": _s("Angular", ["angular", "angularjs", "angular.js"], implies=["typescript"], related=["react", "vue"]),
    "vue": _s("Vue.js", ["vue", "vue.js", "vuejs", "nuxt"], implies=["javascript"], related=["react", "angular"]),
    "redux": _s("Redux", ["redux", "redux toolkit"], implies=["react"]),
    "tailwind": _s("Tailwind CSS", ["tailwind", "tailwindcss", "tailwind css"], implies=["css"]),
    "bootstrap": _s("Bootstrap", ["bootstrap"], implies=["css"]),

    # ---- Mobile -----------------------------------------------------------
    "android": _s("Android", ["android"], related=["kotlin"]),
    "ios": _s("iOS", ["re:\\bios\\b"], related=["swift"]),
    "flutter": _s("Flutter", ["flutter"], implies=["dart"], related=["react native"]),
    "react native": _s("React Native", ["react native", "react-native"], implies=["react"], related=["flutter"]),

    # ---- Databases --------------------------------------------------------
    "postgresql": _s("PostgreSQL", ["postgresql", "postgres", "postgre"], implies=["sql"], related=["mysql", "oracle db"]),
    "mysql": _s("MySQL", ["mysql", "mariadb"], implies=["sql"], related=["postgresql", "oracle db"]),
    "oracle db": _s("Oracle Database", ["oracle database", "oracle db", "re:\\boracle\\b(?= ?(11|12|19|sql|pl))"],
                    implies=["sql"], related=["postgresql", "mysql"]),
    "sql server": _s("SQL Server", ["sql server", "mssql", "ms sql"], implies=["sql"], related=["postgresql", "mysql"]),
    "mongodb": _s("MongoDB", ["mongodb", "mongo db", "mongoose"], related=["nosql"]),
    "redis": _s("Redis", ["redis"]),
    "elasticsearch": _s("Elasticsearch", ["elasticsearch", "elastic search", "elk"]),
    "nosql": _s("NoSQL", ["nosql", "no-sql"]),

    # ---- Cloud / DevOps ---------------------------------------------------
    "docker": _s("Docker", ["docker", "dockerfile", "docker compose", "docker-compose"], related=["kubernetes"]),
    "kubernetes": _s("Kubernetes", ["kubernetes", "k8s", "openshift"], related=["docker"]),
    "aws": _s("AWS", ["aws", "amazon web services", "ec2", "aws lambda"], related=["azure", "gcp"]),
    "azure": _s("Azure", ["azure", "microsoft azure"], related=["aws", "gcp"]),
    "gcp": _s("Google Cloud", ["gcp", "google cloud", "google cloud platform"], related=["aws", "azure"]),
    "ci/cd": _s("CI/CD", ["ci/cd", "ci cd", "continuous integration", "continuous delivery", "continuous deployment",
                          "github actions", "gitlab ci", "azure devops", "intégration continue",
                          "déploiement continu", "livraison continue"]),
    "jenkins": _s("Jenkins", ["jenkins"], implies=["ci/cd"]),
    "terraform": _s("Terraform", ["terraform"]),
    "ansible": _s("Ansible", ["ansible"]),
    "linux": _s("Linux", ["linux", "ubuntu", "debian", "centos", "red hat"]),
    "git": _s("Git", ["git", "github", "gitlab", "bitbucket"]),
    "nginx": _s("Nginx", ["nginx"]),

    # ---- Testing / QA -----------------------------------------------------
    "unit testing": _s("Unit testing", ["unit testing", "unit tests", "tdd", "test-driven", "tests unitaires",
                                        "test unitaire"]),
    "junit": _s("JUnit", ["junit", "mockito"], implies=["unit testing"]),
    "jest": _s("Jest", ["jest", "react testing library", "vitest"], implies=["unit testing"]),
    "test automation": _s("Test automation", ["test automation", "automated testing", "automated tests",
                                              "tests automatisés", "test automatisé", "automatisation des tests"]),
    "selenium": _s("Selenium", ["selenium", "webdriver"], implies=["test automation"], related=["cypress", "playwright"]),
    "cypress": _s("Cypress", ["cypress"], implies=["test automation"], related=["selenium", "playwright"]),
    "playwright": _s("Playwright", ["playwright"], implies=["test automation"], related=["selenium", "cypress"]),
    "manual testing": _s("Manual testing", ["manual testing", "test cases", "test plans", "functional testing",
                                            "regression testing", "tests fonctionnels"]),
    "istqb": _s("ISTQB", ["istqb"]),
    "postman": _s("Postman", ["postman"]),

    # ---- Data / AI --------------------------------------------------------
    "machine learning": _s("Machine learning", ["machine learning", "apprentissage automatique", "ml models",
                                                "intelligence artificielle"]),
    "deep learning": _s("Deep learning", ["deep learning", "neural networks", "réseaux de neurones"],
                        implies=["machine learning"]),
    "nlp": _s("NLP", ["nlp", "natural language processing", "traitement du langage"], implies=["machine learning"]),
    "tensorflow": _s("TensorFlow", ["tensorflow", "keras"], implies=["deep learning"], related=["pytorch"]),
    "pytorch": _s("PyTorch", ["pytorch"], implies=["deep learning"], related=["tensorflow"]),
    "scikit-learn": _s("scikit-learn", ["scikit-learn", "sklearn", "scikit learn"], implies=["machine learning", "python"]),
    "pandas": _s("pandas", ["pandas"], implies=["python"]),
    "numpy": _s("NumPy", ["numpy"], implies=["python"]),
    "spark": _s("Apache Spark", ["spark", "pyspark", "apache spark"]),
    "power bi": _s("Power BI", ["power bi", "powerbi", "dax"], related=["tableau"]),
    # "tableau de bord" (dashboard) and "tableaux croisés" are French, not Tableau.
    "tableau": _s("Tableau", ["re:\\btableau\\b(?! de bord| croisé|x)"], related=["power bi"]),
    "excel": _s("Excel", ["excel", "microsoft excel", "ms excel", "vba", "pivot tables", "tableaux croisés"]),
    "data analysis": _s("Data analysis", ["data analysis", "data analytics", "data analyst", "analyse de données",
                                          "analyse des données"]),
    "data visualization": _s("Data visualization", ["data visualization", "data visualisation", "dashboards", "dataviz"]),
    "statistics": _s("Statistics", ["statistics", "statistical analysis", "statistiques"]),
    "etl": _s("ETL", ["etl", "data pipelines", "talend", "airflow", "informatica"]),
    "llm": _s("LLMs", ["llm", "llms", "large language models", "langchain", "rag"], related=["nlp"]),

    # ---- Design / product -------------------------------------------------
    "figma": _s("Figma", ["figma"], related=["adobe xd"]),
    "adobe xd": _s("Adobe XD", ["adobe xd"], related=["figma"]),
    "photoshop": _s("Photoshop", ["photoshop"]),
    "illustrator": _s("Illustrator", ["illustrator"]),
    "ui/ux": _s("UI/UX design", ["ui/ux", "ux design", "ui design", "user experience", "user interface design",
                                 "wireframing", "prototyping", "maquettage"]),

    # ---- Methodologies / management ---------------------------------------
    "agile": _s("Agile", ["agile", "agiles", "agilité", "méthodes agiles", "méthodologie agile"], related=["scrum"]),
    "scrum": _s("Scrum", ["scrum", "sprint planning", "scrum master"], implies=["agile"]),
    "jira": _s("Jira", ["jira", "confluence"]),
    "project management": _s("Project management", ["project management", "gestion de projet", "gestion de projets",
                                                    "pmp", "prince2"]),
    "team management": _s("Team management", ["team management", "people management", "team leadership",
                                              "gestion d'équipe", "management d'équipe", "encadrement d'équipe"]),
    "uml": _s("UML", ["uml"]),

    # ---- Business functions -----------------------------------------------
    "seo": _s("SEO", ["seo", "search engine optimization", "référencement naturel"]),
    "digital marketing": _s("Digital marketing", ["digital marketing", "marketing digital", "social media marketing",
                                                  "google ads", "facebook ads", "sem", "réseaux sociaux",
                                                  "community management", "marketing numérique"]),
    "content writing": _s("Content writing", ["content writing", "copywriting", "rédaction web", "content creation"]),
    "crm": _s("CRM", ["crm", "salesforce", "hubspot"]),
    "accounting": _s("Accounting", ["accounting", "comptabilité", "bookkeeping", "ifrs"]),
    "financial analysis": _s("Financial analysis", ["financial analysis", "analyse financière", "financial modeling",
                                                    "budgeting", "forecasting"]),
    "sap": _s("SAP", ["sap", "sap erp", "sap fi", "sap mm"]),
    "recruitment": _s("Recruitment", ["recruitment", "recrutement", "talent acquisition", "sourcing"]),
    "payroll": _s("Payroll", ["payroll", "paie"]),
    "customer support": _s("Customer support", ["customer support", "customer service", "service client",
                                                "support client", "helpdesk", "relation client",
                                                "relation clientèle", "service après-vente"]),
    "sales": _s("Sales", ["b2b sales", "b2c sales", "business development", "prospection", "account management"]),
}


# Spoken languages. Aliases cover English and French spellings.
LANGUAGES = {
    "english": ("English", ["english", "anglais"]),
    "french": ("French", ["french", "français", "francais", "française"]),
    "arabic": ("Arabic", ["arabic", "arabe"]),
    "german": ("German", ["german", "allemand", "deutsch"]),
    "spanish": ("Spanish", ["spanish", "espagnol", "español"]),
    "italian": ("Italian", ["italian", "italien"]),
    "portuguese": ("Portuguese", ["portuguese", "portugais"]),
    "chinese": ("Chinese", ["chinese", "mandarin", "chinois"]),
    "japanese": ("Japanese", ["japanese", "japonais"]),
    "russian": ("Russian", ["russian", "russe"]),
    "turkish": ("Turkish", ["turkish", "turc"]),
    "dutch": ("Dutch", ["dutch", "néerlandais"]),
}

# Proficiency, from strongest to weakest; the first keyword found wins, so
# longer phrases come before their substrings.
LANGUAGE_LEVELS = [
    ("native", 1.0, ["native", "mother tongue", "langue maternelle", "natif", "native speaker", "maternelle"]),
    ("fluent", 0.9, ["bilingual", "bilingue", "fluent", "fluently", "courant", "courante", "couramment", "c2", "c1",
                     "full professional", "excellent", "excellente", "parfaite maîtrise", "parfaitement"]),
    ("professional", 0.75, ["b2", "upper-intermediate", "upper intermediate", "professional working", "professional",
                            "good command", "good level", "bon niveau", "très bon", "très bonne", "bonne maîtrise",
                            "very good", "good", "bonne", "bon"]),
    ("intermediate", 0.55, ["b1", "intermediate", "intermédiaire", "conversational"]),
    ("basic", 0.3, ["a2", "a1", "basic", "notions", "elementary", "débutant", "beginner", "scolaire"]),
]
# A language mentioned without any level in a CV is taken as working
# proficiency; in an offer, as "needs to be usable at work".
DEFAULT_CANDIDATE_LANGUAGE_LEVEL = ("unspecified", 0.75)
DEFAULT_REQUIRED_LANGUAGE_LEVEL = ("working", 0.6)

# Education ladder (level, label, phrases). Checked highest first.
EDUCATION_LEVELS = [
    (5, "PhD", ["phd", "ph.d", "doctorate", "doctorat", "doctoral degree"]),
    (4, "Master's / engineering degree", [
        "master's degree", "masters degree", "master degree", "master of", "master's", "masters", "mastère",
        "msc", "m.sc", "mba", "engineering degree", "diplôme d'ingénieur", "diplome d'ingenieur",
        "diplôme national d'ingénieur", "cycle ingénieur", "cycle d'ingénieur", "école d'ingénieur",
        "ingénieur diplômé", "bac+5", "bac + 5", "re:(?<!scrum )\\bmaster\\b(?! data)",
    ]),
    (3, "Bachelor's degree", [
        "bachelor's degree", "bachelors degree", "bachelor degree", "bachelor of", "bachelor's", "bachelor",
        "licence", "license degree", "bsc", "b.sc", "undergraduate degree", "bac+3", "bac + 3",
    ]),
    (2, "Two-year degree (BTS/DUT)", [
        "associate degree", "bts", "dut", "bac+2", "bac + 2", "technicien supérieur", "higher national diploma",
    ]),
    (1, "High school diploma", [
        "baccalauréat", "baccalaureat", "high school diploma", "high school", "re:\\bbac\\b(?! ?\\+)",
    ]),
]

# Seniority words used only when an offer states no explicit number of years.
SENIORITY_YEARS = [
    ("lead", 7, ["principal engineer", "staff engineer", "head of", "lead developer", "lead engineer",
                 "tech lead", "team lead"]),
    ("senior", 5, ["senior", "sénior", "expérimenté"]),
    ("mid", 3, ["mid-level", "mid level", "intermediate level", "confirmé"]),
    ("junior", 1, ["junior", "entry level", "entry-level", "recent graduate", "new graduate", "jeune diplômé",
                   "débutant"]),
    ("internship", 0, ["intern", "internship", "stage", "stagiaire", "pfe", "apprenti", "alternance"]),
]
