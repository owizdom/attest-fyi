"use client";
import { useEffect } from "react";

// The shared modal shell. Lifted out of Actions.tsx unchanged so the challenge
// page's modals can reuse it instead of carrying a second copy.
export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  /** a string for a plain heading, or nodes for a header that carries an
      avatar, badges and actions */
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? " wide" : ""}`}>
        <div className="modal-head">
          {typeof title === "string" ? <h3>{title}</h3> : title}
          <button className="modal-x" onClick={onClose} aria-label="close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
