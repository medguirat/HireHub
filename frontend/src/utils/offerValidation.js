// yyyy-mm-dd in the user's own time zone (toISOString would use UTC).
const localDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Same rules as the backend's JobOfferRequestDto, checked before sending.
export function validateOffer(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = "Give the offer a title.";
  if (!form.description.trim()) errors.description = "Describe the role and what you expect from candidates.";
  if (!form.location.trim()) errors.location = "Where is the job? A city, or \"Remote\".";
  if (!form.contractType) errors.contractType = "Choose a contract type.";
  const today = localDate(new Date());
  if (!form.deadline) errors.deadline = "Choose an application deadline.";
  else if (form.deadline <= today) errors.deadline = "The deadline must be after today.";
  return errors;
}

/** The API answers invalid fields with {field: message}; anything else is a general error. */
export function serverFieldErrors(data) {
  if (!data || typeof data !== "object" || data.message) return {};
  return Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v === "string"));
}

export const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localDate(d);
};
