import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CandidateOffers from "./CandidateOffers";
import candidateService from "../services/candidateService";
import { ToastProvider } from "../components/Toast";

vi.mock("../services/candidateService", () => ({
  default: { browseOffers: vi.fn(), getMyCv: vi.fn(), getOfferMatch: vi.fn() },
}));

const offer = (id, title) => ({ id, title, companyName: "Acme", location: "Tunis", contractType: "CDI", description: "…" });
const page = (items) => ({ content: items, totalPages: 1 });

describe("CandidateOffers search", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows the latest search even if an earlier, slower one answers after it", async () => {
    const user = userEvent.setup();
    let releaseSlow;
    candidateService.browseOffers.mockImplementation(({ keyword }) => {
      if (keyword === "slow") return new Promise((resolve) => { releaseSlow = () => resolve(page([offer(1, "Stale result")])); });
      if (keyword === "java") return Promise.resolve(page([offer(2, "Java Developer")]));
      return Promise.resolve(page([offer(3, "First load")]));
    });
    render(<ToastProvider><CandidateOffers /></ToastProvider>);
    await screen.findByRole("heading", { name: "First load", level: 3 });

    const keyword = screen.getByPlaceholderText("Title, skills, keyword...");
    await user.clear(keyword);
    await user.type(keyword, "slow{Enter}");
    await user.clear(keyword);
    await user.type(keyword, "java{Enter}");
    await screen.findByRole("heading", { name: "Java Developer", level: 3 });

    releaseSlow();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText("Stale result")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Java Developer", level: 3 })).toBeInTheDocument();
  });

  it("offers to clear the filters when nothing matches, and sends real contract values", async () => {
    const user = userEvent.setup();
    candidateService.browseOffers.mockImplementation(({ contractType }) =>
      Promise.resolve(page(contractType ? [] : [offer(1, "Any offer")])));
    render(<ToastProvider><CandidateOffers /></ToastProvider>);
    await screen.findByRole("heading", { name: "Any offer", level: 3 });

    await user.selectOptions(screen.getByRole("combobox"), "STAGE");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("No offers match your search")).toBeInTheDocument();
    expect(candidateService.browseOffers).toHaveBeenLastCalledWith(expect.objectContaining({ contractType: "STAGE", page: 0 }));

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Any offer", level: 3 })).toBeInTheDocument());
  });
});
