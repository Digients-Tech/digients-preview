import { useEffect, useState } from "react";
import { getSession, logout } from "./api.ts";
import { Login } from "./components/Login.tsx";
import { L4Explorer } from "./components/L4Explorer.tsx";
import { Mark } from "./components/ExplorerIcons.tsx";

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setFailed(false);
    getSession()
      .then(setAuthed)
      .catch(() => setFailed(true));
  }, [retry]);
  if (failed)
    return (
      <div className="boot">
        <Mark />
        <h1>Unable to connect</h1>
        <p>Check your connection and try again.</p>
        <button className="button" onClick={() => setRetry((n) => n + 1)}>
          Try again
        </button>
      </div>
    );
  if (authed === null)
    return (
      <div className="boot" role="status">
        <Mark />
        <p>Opening the collection…</p>
      </div>
    );
  if (!authed) return <Login onAuthed={() => setAuthed(true)} />;
  return (
    <L4Explorer
      onSessionExpired={() => setAuthed(false)}
      onLogout={async () => {
        await logout();
        setAuthed(false);
      }}
    />
  );
}
