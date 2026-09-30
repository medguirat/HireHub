import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecruiterStats from "./RecruiterStats";
import recruiterService from "../services/recruiterService";

vi.mock("../services/recruiterService", () => ({
  default: { getOffers: vi.fn(), getApplications: vi.fn() },
}));

const page = (content) => Promise.resolve({ content, totalPages: 1 });
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthsAgo = (n) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - n); return iso(d); };

describe("RecruiterStats period selector", () => {
  beforeEach(() => {
    recruiterService.getOffers.mockReturnValue(page([
      { id: 1, title: "Recent CDI", contractType: "CDI", publicationDate: monthsAgo(0) },
      { id: 2, title: "Spring internship", contractType: "STAGE", publicationDate: monthsAgo(4) },
      { id: 3, title: "Last year's CDD", contractType: "CDD", publicationDate: monthsAgo(9) },
    ]));
    recruiterService.getApplications.mockReturnValue(page([
      { id: 1, jobOfferId: 1, status: "PENDING", applicationDate: monthsAgo(0) },
      { id: 2, jobOfferId: 2, status: "REJECTED", applicationDate: monthsAgo(4) },
      { id: 3, jobOfferId: 3, status: "ACCEPTED", applicationDate: monthsAgo(9) },
    ]));
  });
  afterEach(() => vi.clearAllMocks());

  it("3M, 6M and 1Y show different figures computed from the data", async () => {
    const user = userEvent.setup();
    render(<RecruiterStats />);

    // Default: 6 months.
    expect(await screen.findByText("Last 6 months: 2 offers published, 2 applications received.")).toBeInTheDocument();
    expect(screen.getByTestId("contract-Internships")).toHaveTextContent("1 offer");

    await user.click(screen.getByRole("button", { name: "3M" }));
    expect(screen.getByText("Last 3 months: 1 offer published, 1 application received.")).toBeInTheDocument();
    expect(screen.getByTestId("contract-Internships")).toHaveTextContent("0 offers");
    expect(screen.getByRole("button", { name: "3M" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "1Y" }));
    expect(screen.getByText("Last 12 months: 3 offers published, 3 applications received.")).toBeInTheDocument();
    expect(screen.getByTestId("contract-CDD")).toHaveTextContent("1 offer");
    const perOffer = screen.getByRole("heading", { name: "Applications per offer" }).closest("section");
    expect(within(perOffer).getByText("Last year's CDD")).toBeInTheDocument();
  });

  it("the chart has one month per period month", async () => {
    const user = userEvent.setup();
    render(<RecruiterStats />);
    await screen.findByText(/Last 6 months:/);
    const chart = () => screen.getByRole("img", { name: /:/ });
    expect(chart().getAttribute("aria-label").split(", ")).toHaveLength(6);
    await user.click(screen.getByRole("button", { name: "1Y" }));
    expect(chart().getAttribute("aria-label").split(", ")).toHaveLength(12);
  });
});
