import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CvMatchModal from "./CvMatchModal";
import candidateService from "../services/candidateService";

vi.mock("../services/candidateService", () => ({
  default: { getMyCv: vi.fn(), getOfferMatch: vi.fn(), uploadMyCv: vi.fn() },
}));

const offer = { id: 7, title: "Java Developer" };
const cv = { fileName: "cv.pdf", uploadedAt: "2026-09-29T10:00:00" };
const httpError = (status, data = {}) => Object.assign(new Error("HTTP " + status), { response: { status, data } });

const MATCH = {
  cached: false,
  computedAt: "2026-09-29T10:00:00",
  result: {
    overall_score: 82,
    categories: {
      skills: { score: 90, applicable: true, effective_weight: 0.5, summary: "6 of 7 required skills" },
      experience: { score: 70, applicable: true, effective_weight: 0.25, summary: "Requires 3+ years; the CV shows about 2 years." },
      education: { score: null, applicable: false, effective_weight: 0, summary: "The offer doesn't specify an education level." },
      languages: { score: null, applicable: false, effective_weight: 0, summary: "The offer doesn't mention language requirements." },
      relevance: { score: 75, applicable: true, effective_weight: 0.25, summary: "Semantic similarity" },
    },
    skills: { matched: [], partial: [], missing_required: ["Docker"], missing_nice_to_have: [], extra: [] },
    recommendations: ["Add a Docker project."],
    recommendations_source: "rules",
  },
};

describe("CvMatchModal", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows the real score and breakdown from the API", async () => {
    candidateService.getMyCv.mockResolvedValue(cv);
    candidateService.getOfferMatch.mockResolvedValue(MATCH);
    render(<CvMatchModal offer={offer} onClose={() => {}} onApply={() => {}} canApply />);

    expect(await screen.findByText("82")).toBeInTheDocument();
    expect(screen.getByText("6 of 7 required skills", { selector: ".match-category__summary" })).toBeInTheDocument();
    expect(screen.getByText("Requires 3+ years; the CV shows about 2 years.")).toBeInTheDocument();
    expect(candidateService.getOfferMatch).toHaveBeenCalledWith(7);
  });

  it("asks for a CV when the candidate has none", async () => {
    candidateService.getMyCv.mockRejectedValue(httpError(404));
    render(<CvMatchModal offer={offer} onClose={() => {}} onApply={() => {}} canApply />);
    expect(await screen.findByLabelText(/CV file \(PDF or DOCX/)).toBeInTheDocument();
    expect(candidateService.getOfferMatch).not.toHaveBeenCalled();
  });

  it("never shows a score when the matching service is down, and offers a retry", async () => {
    const user = userEvent.setup();
    candidateService.getMyCv.mockResolvedValue(cv);
    candidateService.getOfferMatch
      .mockRejectedValueOnce(httpError(503, { message: "The matching service is temporarily unavailable." }))
      .mockResolvedValueOnce(MATCH);
    render(<CvMatchModal offer={offer} onClose={() => {}} onApply={() => {}} canApply />);

    expect(await screen.findByText("No score available right now")).toBeInTheDocument();
    expect(screen.getByText("The matching service is temporarily unavailable.")).toBeInTheDocument();
    expect(screen.queryByText("82")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("82")).toBeInTheDocument();
  });

  it("refuses a wrong file type before uploading", async () => {
    const user = userEvent.setup({ applyAccept: false });
    candidateService.getMyCv.mockRejectedValue(httpError(404));
    render(<CvMatchModal offer={offer} onClose={() => {}} onApply={() => {}} canApply />);
    const input = await screen.findByLabelText(/CV file/);
    await user.upload(input, new File(["hello"], "cv.txt", { type: "text/plain" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/PDF or DOCX|pdf|docx/i);
    expect(screen.getByRole("button", { name: "Upload and compare" })).toBeDisabled();
    expect(candidateService.uploadMyCv).not.toHaveBeenCalled();
  });
});
