import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreateAccount from "./CreateAccount";
import CompanyImportNotice from "../components/CompanyImportNotice";
import authService from "../services/authService";
import recruiterService from "../services/recruiterService";
import api from "../services/api";

vi.mock("../services/recruiterService", () => ({ default: { getProfile: vi.fn() } }));

function Landing({ name }) {
  const location = useLocation();
  return <p>{name}{location.state?.justSignedUp ? " (just signed up)" : ""}{location.state?.notice ? `: ${location.state.notice}` : ""}</p>;
}

function renderSignup() {
  return render(
    <MemoryRouter initialEntries={["/create-account"]}>
      <Routes>
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/login" element={<Landing name="Login page" />} />
        <Route path="/candidate-dashboard" element={<Landing name="Candidate overview" />} />
        <Route path="/recruiter-dashboard" element={<Landing name="Recruiter overview" />} />
      </Routes>
    </MemoryRouter>
  );
}

async function fillCandidate(user) {
  await user.type(screen.getByPlaceholderText("Enter your first name"), "Cyrine");
  await user.type(screen.getByPlaceholderText("Enter your last name"), "Candidate");
  await user.type(screen.getByPlaceholderText("company@email.com"), "cyrine@test.com");
  await user.type(screen.getByPlaceholderText("••••••••"), "Password123!");
}

describe("Signing up signs the user in", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("stores the session from the signup answer and opens the role's overview", async () => {
    const user = userEvent.setup();
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { token: "signup-token", user: { role: "CANDIDATE" } } });
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: { id: 7, firstName: "Cyrine", role: "CANDIDATE" } });
    renderSignup();

    await fillCandidate(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Candidate overview (just signed up)")).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith("/auth/register", expect.objectContaining({ email: "cyrine@test.com", role: "CANDIDATE" }));
    expect(get).toHaveBeenCalledWith("/users/me");
    expect(localStorage.getItem("token")).toBe("signup-token");
    expect(JSON.parse(localStorage.getItem("user"))).toMatchObject({ id: 7, role: "CANDIDATE" });
  });

  it("sends a recruiter to the recruiter overview", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "post").mockResolvedValue({ data: { token: "t", user: { role: "RECRUITER" } } });
    vi.spyOn(api, "get").mockResolvedValue({ data: { id: 8, role: "RECRUITER" } });
    renderSignup();

    await fillCandidate(user);
    await user.selectOptions(screen.getByRole("combobox"), "RECRUITER");
    await user.type(screen.getByPlaceholderText("Your company"), "QA Robotics");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Recruiter overview (just signed up)")).toBeInTheDocument();
  });

  it("asks to log in if the account was created but the session couldn't start", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(api, "post").mockResolvedValue({ data: { token: "t", user: { role: "CANDIDATE" } } });
    vi.spyOn(api, "get").mockRejectedValue(new Error("Network Error"));
    renderSignup();

    await fillCandidate(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Login page: Your account was created. Please log in.")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("stays on the page with the reason when the signup is refused", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "post").mockRejectedValue({ request: {}, response: { status: 400,
      data: { code: "BAD_REQUEST", message: "An account with this email already exists.", correlationId: "c" } } });
    renderSignup();

    await fillCandidate(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("logs in through the same session start", async () => {
    vi.spyOn(api, "post").mockResolvedValue({ data: { token: "login-token" } });
    vi.spyOn(api, "get").mockResolvedValue({ data: { id: 9, role: "RECRUITER" } });
    const signedIn = await authService.login("rec@test.com", "pw");
    expect(signedIn).toMatchObject({ id: 9, role: "RECRUITER" });
    expect(localStorage.getItem("token")).toBe("login-token");
  });
});

describe("Company import notice on the recruiter overview", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const renderNotice = (props) => render(<MemoryRouter><CompanyImportNotice {...props} /></MemoryRouter>);

  it("shows the progress, then the result with a link to review the profile", async () => {
    recruiterService.getProfile
      .mockResolvedValueOnce({ companyImportStatus: "IN_PROGRESS" })
      .mockResolvedValueOnce({ companyImportStatus: "COMPLETED",
        companyImportMessage: "We filled 6 fields from your website. Please review them and correct anything that's off." });
    renderNotice({ justSignedUp: true });

    expect(await screen.findByText("We're building your company profile from your website…")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(await screen.findByText(/We filled 6 fields from your website/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review my company profile" })).toHaveAttribute("href", "/recruiter-dashboard/profile");
    expect(screen.queryByText("We're building your company profile from your website…")).not.toBeInTheDocument();
  });

  it("shows a failed import with a way to the profile, where it can be retried", async () => {
    recruiterService.getProfile.mockResolvedValue({ companyImportStatus: "FAILED",
      companyImportMessage: "We couldn't reach your website." });
    renderNotice({ justSignedUp: true });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't reach your website.");
    expect(screen.getByRole("link", { name: "Open my company profile" })).toBeInTheDocument();
  });

  it("doesn't repeat an old result on later visits", async () => {
    recruiterService.getProfile.mockResolvedValue({ companyImportStatus: "COMPLETED", companyImportMessage: "We filled 6 fields." });
    renderNotice({ justSignedUp: false });
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(recruiterService.getProfile).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("We filled 6 fields.")).not.toBeInTheDocument();
  });
});
