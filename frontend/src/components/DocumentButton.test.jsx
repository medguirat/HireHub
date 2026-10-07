import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DocumentButton from "./DocumentButton";
import fileService from "../services/fileService";

vi.mock("../services/fileService", () => ({ default: { getApplicationFile: vi.fn() } }));
// pdf.js needs a real canvas; the preview itself is covered by the E2E tests.
vi.mock("./PdfPreview", () => ({ default: ({ title }) => <div data-testid="pdf-preview">{title}</div> }));

describe("DocumentButton (private CVs and cover letters)", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:http://localhost/local-copy");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.clearAllMocks());

  it("fetches the file through the API and offers Download and Open without any token in a link", async () => {
    const user = userEvent.setup();
    fileService.getApplicationFile.mockResolvedValue(new Blob(["%PDF-1.4"], { type: "application/pdf" }));
    render(<DocumentButton applicationId={7} fileName="Amine-CV.pdf" label="Open CV" title="CV of Amine Trabelsi" />);

    await user.click(screen.getByRole("button", { name: "Open CV" }));

    expect(fileService.getApplicationFile).toHaveBeenCalledWith(7, "cv");
    expect(await screen.findByRole("dialog", { name: "CV of Amine Trabelsi" })).toBeInTheDocument();
    expect(await screen.findByTestId("pdf-preview")).toBeInTheDocument();
    const download = screen.getByRole("link", { name: "Download" });
    expect(download).toHaveAttribute("download", "Amine-CV.pdf");
    expect(download).toHaveAttribute("href", "blob:http://localhost/local-copy");
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", "blob:http://localhost/local-copy");
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toMatch(/token|Bearer|\/uploads\//);
    }
  });

  it("asks for the cover letter when told to", async () => {
    const user = userEvent.setup();
    fileService.getApplicationFile.mockResolvedValue(new Blob(["%PDF"]));
    render(<DocumentButton applicationId={9} which="cover-letter" fileName="Letter.pdf" label="Open letter" title="Cover letter" />);
    await user.click(screen.getByRole("button", { name: "Open letter" }));
    expect(fileService.getApplicationFile).toHaveBeenCalledWith(9, "cover-letter");
  });

  it("shows the API's reason when the file can't be read (e.g. 403)", async () => {
    const user = userEvent.setup();
    fileService.getApplicationFile.mockRejectedValue({ response: { status: 403,
      data: { code: "FORBIDDEN", message: "You don't have access to this application's files.", correlationId: "c" } } });
    render(<DocumentButton applicationId={7} fileName="cv.pdf" label="Open CV" title="CV" />);

    await user.click(screen.getByRole("button", { name: "Open CV" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You don't have access to this application's files.");
    expect(screen.queryByRole("link", { name: "Download" })).not.toBeInTheDocument();
  });

  it("closes with Escape and frees the local copy", async () => {
    const user = userEvent.setup();
    fileService.getApplicationFile.mockResolvedValue(new Blob(["%PDF"]));
    render(<DocumentButton applicationId={7} fileName="cv.pdf" label="Open CV" title="CV" />);
    await user.click(screen.getByRole("button", { name: "Open CV" }));
    await screen.findByRole("link", { name: "Download" });

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/local-copy");
  });
});
