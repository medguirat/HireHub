import { useState } from "react";
import { useNavigate } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";
import OfferForm from "../components/OfferForm";
import { validateOffer } from "../utils/offerValidation";
import { useToast } from "../components/toastContext";
import { errorMessage, fieldErrors } from "../utils/apiError";

export default function CreateOffer() {
  const navigate = useNavigate();
  const toast = useToast();
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

  const errors = { ...serverErrors, ...validateOffer(form) };

  const updateForm = (next) => {
    setServerErrors({});
    setForm(next);
  };

  const handleSubmit = async () => {
    if (Object.keys(validateOffer(form)).length > 0) return;
    setSubmitting(true);
    try {
      await recruiterService.createOffer(form);
      toast(`"${form.title}" is published.`);
      navigate("/recruiter-dashboard/offers");
    } catch (err) {
      console.error(err);
      const fromServer = fieldErrors(err);
      if (Object.keys(fromServer).length > 0) {
        setServerErrors(fromServer);
      } else {
        setErrorMsg(errorMessage(err, "The offer couldn't be published. Please try again."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-panel">
      <OfferForm
        form={form}
        setForm={updateForm}
        errors={errors}
        submitting={submitting}
        submitLabel="Publish offer"
        submittingLabel="Publishing…"
        onSubmit={handleSubmit}
        onCancel={() => navigate("/recruiter-dashboard/offers")}
      />

      <AlertModal
        isOpen={!!errorMsg}
        type="error"
        title="The offer wasn't published"
        message={errorMsg}
        onClose={() => setErrorMsg("")}
      />
    </div>
  );
}
