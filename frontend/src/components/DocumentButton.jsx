import { useCallback, useState } from "react";
import fileService from "../services/fileService";
import DocumentViewer from "./DocumentViewer";

/** "Open CV" / "Open letter": shows an application's private file in the viewer. */
export default function DocumentButton({ applicationId, which = "cv", fileName, label, title }) {
  const [open, setOpen] = useState(false);
  const load = useCallback(() => fileService.getApplicationFile(applicationId, which), [applicationId, which]);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button type="button" className="cv-link link-reset" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && <DocumentViewer title={title} fileName={fileName} load={load} onClose={close} />}
    </>
  );
}
