import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OfferForm from "./OfferForm";
import ApplyModal from "./ApplyModal";
import { serverFieldErrors, tomorrow, validateOffer } from "../utils/offerValidation";
import candidateService from "../services/candidateService";

vi.mock("../services/candidateService", () => ({
  default: { uploadFile: vi.fn(), createApplication: vi.fn() },
}));

const EMPTY = { title: "", description: "", location: "", contractType: "CDI", deadline: "" };

function OfferFormHarness({ onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  return (
    <OfferForm form={form} setForm={setForm} errors={validateOffer(form)} submitting={false}
      submitLabel="Publish offer" submittingLabel="Publishing…" onSubmit={onSubmit} onCancel={() => {}} />
  );
}

describe("offer validation", () => {
  it("mirrors the backend rules", () => {
    expect(Object.keys(validateOffer(EMPTY)).sort()).toEqual(["deadline", "description", "location", "title"]);
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(validateOffer({ ...EMPTY, deadline: iso }).deadline).toBe("The deadline must be after today.");
    expect(validateOffer({ title: "T", description: "D", location: "L", contractType: "CDI", deadline: tomorrow() })).toEqual({});
  });

  it("reads field errors from the API, and ignores plain messages", () => {
    expect(serverFieldErrors({ title: "Title is required" })).toEqual({ title: "Title is required" });
    expect(serverFieldErrors({ message: "Something else" })).toEqual({});
    expect(serverFieldErrors("text")).toEqual({});
  });

  it("shows errors only after the user tries to submit, then clears them as fields are fixed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<OfferFormHarness onSubmit={onSubmit} />);
    expect(screen.queryByText("Give the offer a title.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Publish offer" }));
    expect(screen.getByText("Give the offer a title.")).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(1); // the page decides not to send while invalid

    await user.type(screen.getByPlaceholderText("e.g. Senior Fullstack Developer"), "Java Developer");
    expect(screen.queryByText("Give the offer a title.")).not.toBeInTheDocument();
  });
});

describe("ApplyModal", () => {
  afterEach(() => vi.clearAllMocks());

  it("blocks a non-PDF or oversized CV before any upload", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<ApplyModal offer={{ id: 3, title: "Java Developer" }} onClose={() => {}} onApplied={() => {}} />);
    const [cvInput] = document.querySelectorAll('input[type="file"]');

    await user.upload(cvInput, new File(["x"], "cv.docx"));
    expect(screen.getByText("Please choose a .pdf file.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send application" })).toBeDisabled();

    const big = new File([new Uint8Array(11 * 1024 * 1024)], "cv.pdf", { type: "application/pdf" });
    await user.upload(cvInput, big);
    expect(screen.getByText(/This file is 11\.0 MB/)).toBeInTheDocument();
    expect(candidateService.uploadFile).not.toHaveBeenCalled();
  });

  it("uploads the CV, sends the application and reports success", async () => {
    const user = userEvent.setup();
    const onApplied = vi.fn();
    candidateService.uploadFile.mockResolvedValue({ url: "http://files/cv.pdf" });
    candidateService.createApplication.mockResolvedValue({ id: 1 });
    render(<ApplyModal offer={{ id: 3, title: "Java Developer" }} onClose={() => {}} onApplied={onApplied} />);

    await user.upload(document.querySelector('input[type="file"]'), new File(["%PDF"], "cv.pdf", { type: "application/pdf" }));
    await user.type(screen.getByPlaceholderText(/Introduce yourself/), "Motivated");
    await user.click(screen.getByRole("button", { name: "Send application" }));

    expect(candidateService.createApplication).toHaveBeenCalledWith("http://files/cv.pdf", "Motivated", 3);
    expect(onApplied).toHaveBeenCalledWith({ id: 3, title: "Java Developer" });
  });

  it("shows the API's message when applying fails (e.g. already applied)", async () => {
    const user = userEvent.setup();
    candidateService.uploadFile.mockResolvedValue({ url: "u" });
    candidateService.createApplication.mockRejectedValue({ response: { data: { message: "You have already applied to this offer." } } });
    render(<ApplyModal offer={{ id: 3, title: "Java Developer" }} onClose={() => {}} onApplied={() => {}} />);
    await user.upload(document.querySelector('input[type="file"]'), new File(["%PDF"], "cv.pdf", { type: "application/pdf" }));
    await user.click(screen.getByRole("button", { name: "Send application" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You have already applied to this offer.");
  });
});
