import { useEffect, useState, type FormEvent } from "react";
import { submitRequestAccess, type RequestAccessPayload } from "../api.ts";

type Form = RequestAccessPayload;
const initialForm: Form = {
  fullName: "",
  organization: "",
  email: "",
  role: "",
  country: "",
  useCase: "",
  estimatedScale: "",
  ndaRequired: false,
};

// Modal-form for the "Request Data Access" CTA. Required: name, organization,
// role, email, country, use case. Optional: estimated scale, NDA flag. On
// success the form swaps to a thank-you state; the user closes it manually.
export function RequestAccessModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<Form>(initialForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // ESC closes; lock body scroll while the modal is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await submitRequestAccess(form);
    setBusy(false);
    if (res.ok) setDone(true);
    else setErr(res.error ?? "submission failed");
  };

  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" type="button" onClick={onClose} aria-label="Close">×</button>
        {done ? (
          <div className="form__done">
            <div className="form__tag form__tag--ok">REQUEST RECEIVED</div>
            <h2 className="form__title">Thanks — we'll be in touch.</h2>
            <p className="form__hint">
              We'll reach out to <strong>{form.email}</strong> within a few business days.
            </p>
            <button type="button" className="form__btn" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form className="form" onSubmit={submit}>
            <div className="form__tag">REQUEST DATA ACCESS</div>
            <h2 className="form__title">Tell us what you need.</h2>
            <p className="form__hint">
              We respond within a few business days. Required fields are marked *.
            </p>

            <div className="form__grid">
              <Field label="Full Name *" autoFocus
                value={form.fullName} onChange={(v) => set("fullName", v)} required />
              <Field label="Organization *"
                value={form.organization} onChange={(v) => set("organization", v)} required />
              <Field label="Role / Title *"
                value={form.role} onChange={(v) => set("role", v)} required
                placeholder="e.g. Research Engineer" />
              <Field label="Email *" type="email"
                value={form.email} onChange={(v) => set("email", v)} required />
              <Field label="Country / Region *"
                value={form.country} onChange={(v) => set("country", v)} required />
              <Field label="Estimated Data Scale"
                value={form.estimatedScale ?? ""} onChange={(v) => set("estimatedScale", v)}
                placeholder="e.g. ~100h, production training set" />
            </div>

            <Field label="Use Case / Purpose *" textarea
              value={form.useCase} onChange={(v) => set("useCase", v)} required
              placeholder="What problem are you solving with this data?" rows={4} />

            <label className="form__check">
              <input
                type="checkbox"
                checked={!!form.ndaRequired}
                onChange={(e) => set("ndaRequired", e.target.checked)}
              />
              <span>NDA required before sharing</span>
            </label>

            {err && <div className="form__err">{err}</div>}

            <button className="form__btn" type="submit" disabled={busy}>
              {busy ? "Submitting…" : "Submit Request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
};

function Field({ label, value, onChange, type = "text", required, textarea, placeholder, rows, autoFocus }: FieldProps) {
  return (
    <label className={`field ${textarea ? "field--full" : ""}`}>
      <span className="field__label">{label}</span>
      {textarea ? (
        <textarea
          className="field__input field__input--area"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          rows={rows ?? 4}
        />
      ) : (
        <input
          className="field__input"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
      )}
    </label>
  );
}
