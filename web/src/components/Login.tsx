import { useState, type FormEvent } from "react";
import { login } from "../api.ts";
import { Mark, Icon } from "./ExplorerIcons.tsx";

export function Login({ onAuthed }: { onAuthed: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (await login(password)) onAuthed();
      else setError("That password did not match. Please try again.");
    } catch {
      setError("Could not connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <a className="brand login-brand" href="/">
        <Mark />
        <span>digients</span>
      </a>
      <main className="login-layout">
        <div className="login-story">
          <span className="overline">EMBODIED INTELLIGENCE / L4</span>
          <h1>
            Human skill,
            <br />
            in context.
          </h1>
          <p>
            Explore the actions, intent, and physical detail behind everyday
            human behavior.
          </p>
          <div className="login-index">
            <span>
              01 <b>See the action</b>
            </span>
            <span>
              02 <b>Understand the intent</b>
            </span>
            <span>
              03 <b>Trace the motion</b>
            </span>
          </div>
        </div>
        <form className="login-form" onSubmit={submit}>
          <span className="overline">PRIVATE COLLECTION</span>
          <h2>A closer look.</h2>
          <p>Enter your access password to explore the data.</p>
          <label htmlFor="access-password">Access password</label>
          <input
            id="access-password"
            type="password"
            value={password}
            autoComplete="current-password"
            required
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : undefined}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
          />
          {error && (
            <p id="login-error" className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button button-primary"
            type="submit"
            disabled={busy || !password}
          >
            {busy ? "Checking access…" : "Enter collection"}
            <Icon name="arrow" />
          </button>
          <p className="login-help">Shared with you by Digients.</p>
        </form>
      </main>
      <footer className="login-footer">Data for intelligence that acts.</footer>
    </div>
  );
}
