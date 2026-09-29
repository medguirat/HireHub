import { useState } from "react";

const initialsOf = (name) =>
  (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

/**
 * A person's photo or a company logo, falling back to initials on the brand
 * gradient when there's no image or it fails to load (never a stock photo).
 */
export default function Avatar({ src, name, size = "md", shape = "circle" }) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  return (
    <span className={`avatar avatar--${size} avatar--${shape}`}>
      {showImage ? (
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{initialsOf(name)}</span>
      )}
    </span>
  );
}
