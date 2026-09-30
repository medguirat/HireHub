import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import authService from "../services/authService";
import { validateNewPassword } from "../utils/password";

vi.mock("../services/authService", () => ({
  default: { requestPasswordReset: vi.fn(), checkResetLink: vi.fn(), resetPassword: vi.fn(), logout: vi.fn() },
}));

const GENERIC = "If an account exists for this email, we've sent a link to reset the password. It works once and expires in 45 minutes.";
const INVALID = { response: { status: 400, data: { code: "RESET_LINK_INVALID", correlationId: "c",
  message: "This reset link is invalid, has already been used or has expired. Please ask for a new one." } } };

function LoginStub() {
  const location = useLocation();
  return <p>Login page: {location.state?.notice}</p>;
}

function renderAt(element, path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={element} />
        <Route path="/login" element={<LoginStub />} />
        <Route path="/forgot-password" element={<p>Forgot password page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Forgot password", () => {
  afterEach(() => vi.clearAllMocks());

  it("sends the email and shows the same answer the API gives for every address", async () => {
    const user = userEvent.setup();
    authService.requestPasswordReset.mockResolvedValue({ message: GENERIC });
    renderAt(<ForgotPassword />);

    await user.type(screen.getByLabelText("Email"), "  amine@demo.hirehub.test ");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(authService.requestPasswordReset).toHaveBeenCalledWith("amine@demo.hirehub.test");
    expect(await screen.findByRole("status")).toHaveTextContent(GENERIC);
  });

  it("checks the address before calling the API", async () => {
    const user = userEvent.setup();
    renderAt(<ForgotPassword />);
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter the email address of your account.");
    expect(authService.requestPasswordReset).not.toHaveBeenCalled();
  });
});

describe("Reset password page", () => {
  beforeEach(() => window.history.replaceState(null, "", "/reset-password#token=secret-token-123"));
  afterEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("reads the token from the link, then removes it from the address bar", async () => {
    authService.checkResetLink.mockResolvedValue({ message: "This link is valid." });
    renderAt(<ResetPassword />);
    expect(await screen.findByLabelText("New password")).toBeInTheDocument();
    expect(authService.checkResetLink).toHaveBeenCalledWith("secret-token-123");
    expect(window.location.href).not.toContain("secret-token-123");
  });

  it("validates the new password, saves it and sends the user to the login page", async () => {
    const user = userEvent.setup();
    authService.checkResetLink.mockResolvedValue({});
    authService.resetPassword.mockResolvedValue({ message: "Your password has been changed." });
    renderAt(<ResetPassword />);

    await user.type(await screen.findByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Repeat the new password"), "different");
    await user.click(screen.getByRole("button", { name: "Save the new password" }));
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(screen.getByText("The two passwords don't match.")).toBeInTheDocument();
    expect(authService.resetPassword).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("New password"));
    await user.type(screen.getByLabelText("New password"), "a-good-password");
    await user.clear(screen.getByLabelText("Repeat the new password"));
    await user.type(screen.getByLabelText("Repeat the new password"), "a-good-password");
    await user.click(screen.getByRole("button", { name: "Save the new password" }));

    expect(authService.resetPassword).toHaveBeenCalledWith("secret-token-123", "a-good-password");
    expect(authService.logout).toHaveBeenCalled();
    expect(await screen.findByText(/Login page: Your password has been changed/)).toBeInTheDocument();
  });

  it("explains an expired or used link and offers a new one", async () => {
    const user = userEvent.setup();
    authService.checkResetLink.mockRejectedValue(INVALID);
    renderAt(<ResetPassword />);

    expect(await screen.findByRole("alert")).toHaveTextContent("has already been used or has expired");
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ask for a new link" }));
    expect(screen.getByText("Forgot password page")).toBeInTheDocument();
  });

  it("says so when the link has no token", async () => {
    window.history.replaceState(null, "", "/reset-password");
    renderAt(<ResetPassword />);
    expect(screen.getByRole("alert")).toHaveTextContent("This reset link is incomplete.");
    expect(authService.checkResetLink).not.toHaveBeenCalled();
  });
});

describe("validateNewPassword", () => {
  it("mirrors the backend rule", () => {
    expect(validateNewPassword("12345678", "12345678")).toEqual({});
    expect(Object.keys(validateNewPassword("1234567", "1234567"))).toEqual(["password"]);
    expect(Object.keys(validateNewPassword("12345678", "x"))).toEqual(["confirmation"]);
  });
});
