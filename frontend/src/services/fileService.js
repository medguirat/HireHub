import api from "./api";

// Two kinds of files:
// - Public images (profile photos, company logos): shown with <img>, served from /uploads
//   under random names. Only PNG, JPEG, GIF and WebP are accepted.
// - Private documents (the CV and cover letter sent with an application): only the candidate
//   and the offer's recruiter can read them, through the API with the login token. They are
//   fetched as Blobs, never opened through a link that would need the token in the URL.

export const IMAGE_TYPES = "image/png,image/jpeg,image/gif,image/webp";

const multipart = (file) => {
  const form = new FormData();
  form.append("file", file);
  return form;
};

const fileService = {
  /** -> { url } */
  uploadImage: async (file) => (await api.post("/files/images", multipart(file))).data,

  /** A PDF to attach to an application -> { id, fileName, size } */
  uploadDocument: async (file) => (await api.post("/candidates/documents", multipart(file))).data,

  /** An application's CV ("cv") or cover letter ("cover-letter"), as a PDF Blob. */
  getApplicationFile: async (applicationId, which) => {
    const response = await api.get(`/applications/${applicationId}/${which}`, { responseType: "blob" });
    return new Blob([response.data], { type: "application/pdf" });
  },
};

export default fileService;
