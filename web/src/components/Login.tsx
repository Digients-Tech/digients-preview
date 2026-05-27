import { useState, type FormEvent } from "react";
import { login } from "../api.ts";

export function Login({ onAuthed }: { onAuthed: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const ok = await login(password);
    setBusy(false);
    if (ok) onAuthed();
    else setError(true);
  };

  return (
    <div className="login">
      <form className="login__card" onSubmit={submit}>
        <div className="login__brand">Digients</div>
        <h1 className="login__title">Data Preview</h1>
        <p className="login__hint">Enter the access password to browse the dataset.</p>
        <input
          className={`login__input ${error ? "login__input--error" : ""}`}
          type="password"
          value={password}
          autoFocus
          placeholder="Access password"
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
        />
        {error && <div className="login__error">Wrong password. Try again.</div>}
        <button className="login__btn" type="submit" disabled={busy || !password}>
          {busy ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
