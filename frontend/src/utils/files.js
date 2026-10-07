// Keep in sync with the backend's spring.servlet.multipart.max-file-size.
export const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Client-side file check so a bad file never reaches the network: a wrong
 * extension or an oversized file fails fast with a clear message.
 */
export function validateFile(file, allowedExtensions) {
  if (!file) return null;
  const name = file.name.toLowerCase();
  if (!allowedExtensions.some((ext) => name.endsWith(ext))) {
    return `Please choose a ${allowedExtensions.join(" or ")} file.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB — please choose one under ${MAX_FILE_SIZE_MB} MB.`;
  }
  return null;
}
