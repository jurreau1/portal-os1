import { useState } from "react";
import { API_URL } from "../api/client";
import { useGovernor } from "../layouts/GovernorLayout";
export default function Settings() {
  const { token, setToken } = useGovernor();
  const [draft, setDraft] = useState(token);
  const [saved, setSaved] = useState(false);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR CONTROL ROOM</div>
          <h1>
            Settings<span className="title-dot">.</span>
          </h1>
          <p>Manage your connection and governor access.</p>
        </div>
      </div>
      <section className="panel settings-panel">
        <h2>Worker connection</h2>
        <p className="muted">
          This workspace connects to the API configured at build time.
        </p>
        <code className="endpoint">{API_URL}</code>
        <h2 className="subheading">Governor access</h2>
        <p className="muted">
          Enter the governor token to approve or reject requests. It stays in
          memory for this tab and clears on reload.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setToken(draft.trim());
            setDraft("");
            setSaved(true);
          }}
        >
          <label htmlFor="token">Governor token</label>
          <input
            id="token"
            type="password"
            autoComplete="off"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setSaved(false);
            }}
          />
          <div className="button-group">
            <button className="primary" type="submit">
              Save access
            </button>
            <button
              type="button"
              onClick={() => {
                setToken("");
                setDraft("");
                setSaved(false);
              }}
            >
              Clear access
            </button>
          </div>
          {saved && <p role="status">Governor access updated.</p>}
          <span className="access-state">
            {token
              ? "Governor token is set for this tab."
              : "Read access only."}
          </span>
        </form>
      </section>
    </>
  );
}
