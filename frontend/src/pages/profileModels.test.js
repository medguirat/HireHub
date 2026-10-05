import { describe, expect, it, vi } from "vitest";
import * as candidate from "./candidateProfile/model";
import * as company from "./recruiterProfile/model";

describe("candidate profile model", () => {
  const filled = () => candidate.toForm({
    firstName: "Cyrine", lastName: "Ben Ali", headline: "Java developer", skills: ["Java"],
    experiences: [{ position: "Developer", company: "Proxym", startDate: "2023-01-01", endDate: null }],
    languages: [{ language: "French", level: "FLUENT" }],
  });

  it("turns API values into form values (no nulls in inputs)", () => {
    const form = filled();
    expect(form.experiences[0].endDate).toBe("");
    expect(form.bio).toBe("");
    expect(candidate.validate(form)).toEqual({});
  });

  it("explains every problem by field", () => {
    const form = { ...filled(), firstName: " ", urlGithub: "not a url",
      languages: [{ language: "French", level: "FLUENT" }, { language: "french", level: "BASIC" }, { language: "", level: "BASIC" }],
      experiences: [{ position: "Dev", company: "X", startDate: "2024-05-01", endDate: "2024-01-01" }] };
    const errors = candidate.validate(form);
    expect(errors.firstName).toBe("Your first name is required.");
    expect(errors.urlGithub).toBe("This doesn't look like a GitHub address.");
    expect(errors["language-1"]).toBe("This language is already listed.");
    expect(errors["language-2"]).toBe("Enter the language, or remove this row.");
    expect(errors["experience-0"]).toBe("The end date is before the start date.");
  });

  it("sends trimmed values and plain levels for a bio draft", () => {
    const form = { ...filled(), languages: [{ language: " French ", level: "FLUENT" }, { language: "", level: "BASIC" }] };
    expect(candidate.toBioDraftRequest(form).languages).toEqual([{ language: "French", level: "fluent" }]);
    expect(candidate.toProfileRequest({ ...form, urlLinkedin: "linkedin.com/in/cyrine" }).urlLinkedin)
      .toBe("https://linkedin.com/in/cyrine");
  });

  it("counts the CV in the completeness checklist", () => {
    const items = candidate.completenessItems({ skills: [] }, true, vi.fn());
    expect(items.find((i) => i.key === "cv").done).toBe(true);
    expect(items.reduce((sum, i) => sum + i.weight, 0)).toBe(100);
  });
});

describe("company profile model", () => {
  const form = () => company.toCompanyForm({ companyName: "Acme", website: "acme.example.com" });
  const basic = { firstName: "Rania", lastName: "Recruiter" };

  it("requires the company name and website, checks addresses and the year", () => {
    expect(company.validate(form(), basic)).toEqual({});
    const errors = company.validate({ ...form(), companyName: "", linkedin: "nope", foundedYear: "12" }, basic);
    expect(errors.companyName).toBe("The company name is required.");
    expect(errors.linkedin).toBe("This doesn't look like a web address.");
    expect(errors.foundedYear).toBe("Enter a year like 2006.");
  });

  it("sends the founded year as a number and full addresses", () => {
    const payload = company.toProfileRequest({ ...form(), foundedYear: " 2015 " });
    expect(payload.foundedYear).toBe(2015);
    expect(payload.website).toBe("https://acme.example.com");
    expect(company.toProfileRequest(form()).foundedYear).toBeNull();
  });

  it("sends the website's own words for a draft only while they are still the imported text", () => {
    const withText = { ...form(), description: "Imported text" };
    expect(company.toDescriptionDraftRequest(withText, new Set(["description"])).websiteDescription).toBe("Imported text");
    expect(company.toDescriptionDraftRequest(withText, new Set()).websiteDescription).toBe("");
  });

  it("splits technologies into tags", () => {
    expect(company.splitList(" Java, React ,, AWS ")).toEqual(["Java", "React", "AWS"]);
  });
});
