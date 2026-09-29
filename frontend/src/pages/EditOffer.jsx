import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";
import OfferForm, { serverFieldErrors, validateOffer } from "../components/OfferForm";
import { SkeletonRows } from "../components/Skeleton";
import { useToast } from "../components/Toast";

export default function EditOffer() {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [serverErrors, setServerErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    contractType: "CDI",
    deadline: ""
  });

  useEffect(() => {
    loadOffer();
  }, [id]);

  const loadOffer = async () => {
    setLoading(true);
    try {
      const data = await recruiterService.getOfferById(id);
      setForm({
        title: data.title || "",
        description: data.description || "",
        location: data.location || "",
        contractType: data.contractType || "CDI",
        deadline: data.deadline || ""
      });
    } catch (err) {
      console.error(err);
      setErrorMsg("This job offer couldn't be loaded.");
    } finally {
      setLoading(false);
    }
  };

  const errors = { ...serverErrors, ...validateOffer(form) };

  const updateForm = (next) => {
    setServerErrors({});
    setForm(next);
  };

  const handleSubmit = async () => {
    if (Object.keys(validateOffer(form)).length > 0) return;
    setSubmitting(true);
    try {
      await recruiterService.updateOffer(id, form);
      toast("Your changes are saved.");
      navigate("/recruiter-dashboard/offers");
    } catch (err) {
      console.error(err);
      const fieldErrors = serverFieldErrors(err.response?.data);
      if (Object.keys(fieldErrors).length > 0) {
        setServerErrors(fieldErrors);
      } else {
        setErrorMsg(err.response?.data?.message || "Your changes couldn't be saved. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-panel">
      {loading ? (
        <SkeletonRows rows={5} />
      ) : (
        <OfferForm
          form={form}
          setForm={updateForm}
          errors={errors}
          submitting={submitting}
          submitLabel="Save changes"
          submittingLabel="Saving…"
          onSubmit={handleSubmit}
          onCancel={() => navigate("/recruiter-dashboard/offers")}
        />
      )}

      <AlertModal
        isOpen={!!errorMsg}
        type="error"
        title="Something went wrong"
        message={errorMsg}
        onClose={() => setErrorMsg("")}
      />
    </div>
  );
}
