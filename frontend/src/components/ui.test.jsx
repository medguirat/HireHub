import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AlertModal from "./AlertModal";
import Pagination from "./Pagination";
import ProtectedRoute from "./ProtectedRoute";
import Sidebar from "./Sidebar";
import Avatar from "./Avatar";
import { DraftNote, ProfileCompleteness } from "./ProfileParts";
import { ToastProvider } from "./Toast";
import { useToast } from "./toastContext";

describe("AlertModal", () => {
  it("takes the focus and closes with Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AlertModal isOpen type="error" title="Something went wrong" message="Try again." onClose={onClose} />);
    expect(screen.getByRole("alertdialog", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OK" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<AlertModal isOpen={false} message="x" onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Pagination", () => {
  it("disables what can't be done and reports the new page", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<Pagination page={0} totalPages={3} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onChange).toHaveBeenCalledWith(1);
    rerender(<Pagination page={2} totalPages={3} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    rerender(<Pagination page={0} totalPages={1} onChange={onChange} />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

describe("ProfileCompleteness", () => {
  it("scores the done items and suggests the biggest missing ones first", async () => {
    const user = userEvent.setup();
    const fixPhoto = vi.fn();
    render(<ProfileCompleteness items={[
      { key: "a", weight: 50, done: true, suggestion: "Done already" },
      { key: "b", weight: 10, done: false, suggestion: "Add a profile photo", onFix: fixPhoto },
      { key: "c", weight: 40, done: false, suggestion: "Add your experience", onFix: () => {} },
    ]} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
    const suggestions = screen.getAllByRole("button").map((b) => b.textContent);
    expect(suggestions[0]).toMatch(/Add your experience/);
    expect(screen.queryByText("Done already")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Add a profile photo/ }));
    expect(fixPhoto).toHaveBeenCalled();
  });
});

describe("DraftNote", () => {
  it("says AI-assisted only when the AI text was actually used", () => {
    const { rerender } = render(<DraftNote draft={{ ai_assisted: false }} />);
    expect(screen.queryByText("AI-assisted")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Built from your own profile data only.");
    rerender(<DraftNote draft={{ ai_assisted: true }} />);
    expect(screen.getByText("AI-assisted")).toBeInTheDocument();
  });
});

describe("Avatar", () => {
  it("shows initials when there is no image, never a stock photo", () => {
    render(<Avatar name="Novatech Solutions" />);
    expect(screen.getByText("NS")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("Toasts", () => {
  function Trigger() {
    const toast = useToast();
    return <button type="button" onClick={() => toast("Offer published.")}>Publish</button>;
  }

  it("shows a confirmation that can be dismissed", async () => {
    const user = userEvent.setup();
    render(<ToastProvider><Trigger /></ToastProvider>);
    await user.click(screen.getByRole("button", { name: "Publish" }));
    expect(screen.getByText("Offer published.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Offer published.")).not.toBeInTheDocument();
  });
});

describe("routing guard and navigation", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  const app = (start, role) => render(
    <MemoryRouter initialEntries={[start]}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route element={<ProtectedRoute allowedRole={role} />}>
          <Route path="/recruiter-dashboard" element={<p>Recruiter home</p>} />
          <Route path="/candidate-dashboard" element={<p>Candidate home</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

  it("sends signed-out visitors to the login page", () => {
    app("/recruiter-dashboard", "RECRUITER");
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("sends a candidate who opens a recruiter page to their own dashboard", () => {
    localStorage.setItem("user", JSON.stringify({ role: "CANDIDATE" }));
    render(
      <MemoryRouter initialEntries={["/recruiter-dashboard"]}>
        <Routes>
          <Route element={<ProtectedRoute allowedRole="RECRUITER" />}>
            <Route path="/recruiter-dashboard" element={<p>Recruiter home</p>} />
          </Route>
          <Route path="/candidate-dashboard" element={<p>Candidate home</p>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Candidate home")).toBeInTheDocument();
  });

  it("treats a corrupted stored user as signed out", () => {
    localStorage.setItem("user", "{not json");
    app("/candidate-dashboard", "CANDIDATE");
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("labels the menu with the page titles", () => {
    localStorage.setItem("user", JSON.stringify({ role: "CANDIDATE" }));
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["Overview", "Job offers", "My applications", "My profile"]);
  });
});
