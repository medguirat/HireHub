import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import candidateService from "../services/candidateService";
import aiService from "../services/aiService";
import fileService, { IMAGE_TYPES } from "../services/fileService";
import AlertModal from "../components/AlertModal";
import Avatar from "../components/Avatar";
import { SkeletonCards } from "../components/Skeleton";
import { useToast } from "../components/toastContext";
import { errorMessage } from "../utils/apiError";
import { updateStoredUser } from "../utils/storedUser";
import CvCard from "./candidateProfile/CvCard";
import ProfileForm from "./candidateProfile/ProfileForm";
import ProfileView from "./candidateProfile/ProfileView";
import useMyCv from "./candidateProfile/useMyCv";
import { LINKS, completenessItems, toBioDraftRequest, toForm, toProfileRequest, validate } from "./candidateProfile/model";
import "../styles/profile.css";

/**
 * "My profile" for candidates: the profile as recruiters see it, or the form to edit it. This
 * component loads and saves; the sections live in ./candidateProfile.
 */
export default function CandidateProfile() {
  const { setUser } = useOutletContext();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const myCv = useMyCv({ onUploaded: () => toast("Your CV is updated. Match scores will use it from now on.") });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await candidateService.getProfile();
        if (!active) return;
        setProfile(data);
        setForm(toForm(data));
      } catch (err) {
        console.error(err);
        setErrorMsg("Your profile couldn't be loaded. Please refresh the page.");
      }
    })();
    return () => { active = false; };
  }, []);

  if (!profile || !form) {
    return (
      <div className="profile-page">
        {errorMsg ? <p className="text-muted">{errorMsg}</p> : <SkeletonCards count={3} />}
      </div>
    );
  }

  const errors = validate(form);
  const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();

  const startEditing = () => {
    setForm(toForm(profile));
    setSubmitted(false);
    setDraft(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setForm(toForm(profile));
    setEditing(false);
    setDraft(null);
  };

  const handlePicture = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.split(",").includes(file.type)) {
      setErrorMsg("Please choose a PNG, JPEG, GIF or WebP image.");
      return;
    }
    setUploadingPicture(true);
    try {
      const { url } = await fileService.uploadImage(file);
      setForm((f) => ({ ...f, picture: url }));
    } catch (err) {
      console.error(err);
      setErrorMsg(errorMessage(err, "Your photo couldn't be uploaded. Please try again."));
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleDraftBio = async () => {
    setDrafting(true);
    try {
      const result = await aiService.draftBio(toBioDraftRequest(form));
      setForm((f) => ({ ...f, bio: result.text }));
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
      const updatedUser = await candidateService.updateBasicInfo({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      const updated = await candidateService.updateProfile(toProfileRequest(form));
      setProfile(updated);
      setForm(toForm(updated));
      setEditing(false);
      setDraft(null);
      const names = { firstName: updatedUser.firstName, lastName: updatedUser.lastName };
      setUser((prev) => ({ ...prev, ...names, candidateProfile: updated }));
      updateStoredUser(names);
      toast("Your profile is saved.");
    } catch (err) {
      setErrorMsg(errorMessage(err, "Your profile couldn't be saved. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page page-stack">
      <header className="profile-hero">
        <Avatar src={editing ? form.picture : profile.picture} name={fullName} size="lg" />
        <div className="profile-hero__main">
          <h2 className="profile-hero__name">{fullName || "Your name"}</h2>
          {profile.headline
            ? <p className="profile-hero__tagline">{profile.headline}</p>
            : <p className="profile-hero__tagline profile-hero__tagline--empty">No headline yet</p>}
          <div className="profile-hero__meta">
            <span>{profile.email}</span>
            {LINKS.filter(({ key }) => profile[key]).map(({ key, label }) => (
              <a key={key} className="link-chip" href={profile[key]} target="_blank" rel="noreferrer">{label} ↗</a>
            ))}
          </div>
        </div>
        {!editing && (
          <div className="profile-hero__actions">
            <button type="button" className="primary-btn" onClick={startEditing}>Edit profile</button>
          </div>
        )}
      </header>

      {!editing ? (
        <ProfileView
          profile={profile}
          completeness={completenessItems(profile, !!myCv.cv, setEditing)}
          cvCard={<CvCard {...myCv} onFile={myCv.upload} />}
        />
      ) : (
        <ProfileForm
          form={form} setForm={setForm} errors={errors} submitted={submitted} saving={saving}
          onSubmit={handleSave} onCancel={cancelEditing}
          onPicture={handlePicture} uploadingPicture={uploadingPicture}
          onDraftBio={handleDraftBio} drafting={drafting} draft={draft}
        />
      )}

      <AlertModal isOpen={!!errorMsg} type="error" title="Something went wrong" message={errorMsg} onClose={() => setErrorMsg("")} />
    </div>
  );
}
