import { matchPath } from "react-router-dom";

// Title and one-line purpose of each dashboard page, shown in the layout header.
const PAGES = [
  { path: "/recruiter-dashboard", title: "Overview", subtitle: "Your offers and the latest applications at a glance." },
  { path: "/recruiter-dashboard/offers", title: "Job offers", subtitle: "Publish, edit and close your offers." },
  { path: "/recruiter-dashboard/offers/:id/applications", title: "Applicants", subtitle: "Everyone who applied to this offer." },
  { path: "/recruiter-dashboard/create-offer", title: "New job offer", subtitle: "It goes live for candidates as soon as you publish it." },
  { path: "/recruiter-dashboard/edit-offer/:id", title: "Edit job offer", subtitle: "Changes are visible to candidates right away." },
  { path: "/recruiter-dashboard/applications", title: "Applications", subtitle: "Every application to your offers." },
  { path: "/recruiter-dashboard/applications/:id/rate", title: "Candidate evaluation", subtitle: "Rate the candidate, decide, and schedule an interview." },
  { path: "/recruiter-dashboard/stats", title: "Statistics", subtitle: "Applications, offers and outcomes over time." },
  { path: "/recruiter-dashboard/profile", title: "Company profile", subtitle: "What candidates see about your company." },
  { path: "/candidate-dashboard", title: "Overview", subtitle: "Your applications and the newest offers." },
  { path: "/candidate-dashboard/offers", title: "Job offers", subtitle: "Search open offers and check how well your CV matches." },
  { path: "/candidate-dashboard/applications", title: "My applications", subtitle: "Track where each application stands." },
  { path: "/candidate-dashboard/profile", title: "My profile", subtitle: "Your details, skills and experience." },
];

export default function pageTitle(pathname) {
  return PAGES.find((p) => matchPath({ path: p.path, end: true }, pathname)) || { title: "HireHub", subtitle: "" };
}
