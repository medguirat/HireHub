export const MIN_PASSWORD_LENGTH = 8; // same rule as the backend (signup and reset)

/** Errors per field for the "choose a new password" form ({} when both are fine). */
export function validateNewPassword(password, confirmation) {
  const errors = {};
  if (password.length < MIN_PASSWORD_LENGTH) errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (confirmation !== password) errors.confirmation = "The two passwords don't match.";
  return errors;
}
