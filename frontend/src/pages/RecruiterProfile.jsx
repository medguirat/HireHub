import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import aiService from "../services/aiService";
import fileService, { IMAGE_TYPES } from "../services/fileService";
import AlertModal from "../components/AlertModal";
import Avatar from "../components/Avatar";
import { SkeletonCards } from "../components/Skeleton";
import { useToast } from "../components/toastContext";
import { errorMessage } from "../utils/apiError";
import { updateStoredUser } from "../utils/storedUser";
import ImportBanner from "./recruiterProfile/ImportBanner";
import ProfileForm from "./recruiterProfile/ProfileForm";
import ProfileView from "./recruiterProfile/ProfileView";
import useCompanyImport from "./recruiterProfile/useCompanyImport";
import { completenessItems, toCompanyForm, toDescriptionDraftRequest, toProfileRequest, validate } from "./recruiterProfile/model";
import "../styles/profile.css";

/**
 * "Company profile" for recruiters: the profile as candidates see it, or the form to edit it, and
 * the import from the company website. This component loads and saves; the sections live in
 * ./recruiterProfile.
 */
export default function RecruiterProfile() {
  const { setUser } = useOutletContext();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [basic, setBasic] = useState({ firstName: "", lastName: "" });
  const [editing, setEditing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const companyImport = useCompanyImport({ setProfile, setForm, onError: setErrorMsg });
  const applyImportState = companyImport.apply;

  const applyProfile = useCallback((p) => {
    setProfile(p);
    setForm(toCompanyForm(p));
    setBasic({ firstName: p.firstName || "", lastName: p.lastName || "" });
    applyImportState(p);
  }, [applyImportState]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await recruiterService.getProfile();
        if (!active) return;
        applyProfile(p);
        setUser((prev) => ({ ...prev, recruiterProfile: p }));
      } catch (err) {
        console.error(err);
        setErrorMsg("Your company profile couldn't be loaded. Please refresh the page.");
      }
    })();
    return () => { active = false; };
  }, [setUser, applyProfile]);

  if (!profile || !form) {
    return (
      <div className="profile-page">
        {errorMsg ? <p className="text-muted">{errorMsg}</p> : <SkeletonCards count={3} />}
      </div>
    );
  }

  const p = profile;
  const errors = validate(form, basic);
  const tagline = [p.industry, p.headquarters].filter(Boolean).join(" · ");

  const startEditing = () => {
    setForm(toCompanyForm(p));
    setBasic({ firstName: p.firstName || "", lastName: p.lastName || "" });
    companyImport.setAutoFilled(new Set(p.autoFilledFields || []));
    setSubmitted(false);
    setDraft(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setForm(toCompanyForm(p));
    companyImport.setAutoFilled(new Set(p.autoFilledFields || []));
    setDraft(null);
    setEditing(false);
  };

  const startImport = () => companyImport.start(form.website.trim() || p.website);

  const handleLogo = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    // SVG isn't accepted: an SVG file can contain scripts, and logos are served publicly.
    if (!IMAGE_TYPES.split(",").includes(file.type)) {
      setErrorMsg("Please choose a PNG, JPEG, GIF or WebP image.");
      return;
    }
    setUploadingLogo(true);
    try {
      const { url } = await fileService.uploadImage(file);
      setForm((prev) => ({ ...prev, logo: url }));
      companyImport.unmark("logo");
    } catch (err) {
      console.error(err);
      setErrorMsg(errorMessage(err, "The logo couldn't be uploaded. Please try again."));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDraftDescription = async () => {
    setDrafting(true);
    try {
      const result = await aiService.draftCompanyDescription(toDescriptionDraftRequest(form, companyImport.autoFilled));
      setForm((prev) => ({ ...prev, description: result.text }));
      companyImport.unmark("description");
      setDraft(result);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setDrafting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      document.querySelector("[aria-invalid='true']")?.focus();
      return;
    }
    setSaving(true);
    try {
      const updatedUser = await recruiterService.updateBasicInfo({
        firstName: basic.firstName.trim(), lastName: basic.lastName.trim(),
      });
      const updated = await recruiterService.updateProfile(toProfileRequest(form));
      applyProfile(updated);
      setEditing(false);
      setDraft(null);
      const names = { firstName: updatedUser.firstName, lastName: updatedUser.lastName };
      setUser((prev) => ({ ...prev, ...names, recruiterProfile: updated }));
      updateStoredUser({
        ...names,
        recruiterProfile: { companyName: updated.companyName, logo: updated.logo, headquarters: updated.headquarters },
      });
      toast("Your company profile is saved.");
    } catch (err) {
      setErrorMsg(errorMessage(err, "Your company profile couldn't be saved. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page page-stack">
      <header className="profile-hero">
        <Avatar src={editing ? form.logo : p.logo} name={p.companyName || "Company"} size="lg" shape="rounded" />
        <div className="profile-hero__main">
          <h2 className="profile-hero__name">{p.companyName || "Your company"}</h2>
          {tagline
            ? <p className="profile-hero__tagline">{tagline}</p>
            : <p className="profile-hero__tagline profile-hero__tagline--empty">Industry and location not set</p>}
          <div className="profile-hero__meta">
            <span>Recruiter: {`${p.firstName || ""} ${p.lastName || ""}`.trim()}</span>
            {p.website && <a className="link-chip" href={p.website} target="_blank" rel="noreferrer">{p.website.replace(/^https?:\/\//, "")} ↗</a>}
          </div>
        </div>
        {!editing && (
          <div className="profile-hero__actions">
            <button type="button" className="primary-btn" onClick={startEditing}>Edit profile</button>
          </div>
        )}
      </header>

      <ImportBanner companyImport={companyImport} canRetry={!!(form.website || p.website)} onRetry={startImport} />

      {!editing ? (
        <ProfileView profile={p} completeness={completenessItems(p, setEditing)} />
      ) : (
        <ProfileForm
          form={form} setForm={setForm} basic={basic} setBasic={setBasic}
          errors={errors} submitted={submitted} saving={saving}
          onSubmit={handleSave} onCancel={cancelEditing}
          companyImport={companyImport} onImport={startImport}
          onLogo={handleLogo} uploadingLogo={uploadingLogo}
          onDraftDescription={handleDraftDescription} drafting={drafting} draft={draft}
        />
      )}

      <AlertModal isOpen={!!errorMsg} type="error" title="Something went wrong" message={errorMsg} onClose={() => setErrorMsg("")} />
    </div>
  );
}
