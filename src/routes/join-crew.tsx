import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import PublicLayout from "@/components/PublicLayout";
import { setActiveWorkspaceId } from "@/lib/crm";

export const Route = createFileRoute("/join-crew")({
  ssr: false,
  validateSearch: z.object({ token: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Join the crew — Northwest Moving Crew" },
      { name: "description", content: "Accept your invite to join the Northwest Moving Crew team workspace." },
      { property: "og:title", content: "Join the crew — Northwest Moving Crew" },
      { property: "og:description", content: "Accept your crew invite and set up your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JoinCrew,
});

type Info = { workspace_name: string; crew_role: string; valid: boolean };

function JoinCrew() {
  const { token = "" } = Route.useSearch();
  const navigate = useNavigate();
  const [info, setInfo] = useState<Info | null | undefined>(undefined);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [crewRole, setCrewRole] = useState("helper");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.rpc("crew_invite_info", { _token: token }).then(({ data }) => {
      const row = (data as Info[] | null)?.[0] ?? null;
      setInfo(row);
      if (row) setCrewRole(row.crew_role);
    });
    void supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, [token]);

  const goLogin = () => {
    sessionStorage.setItem("nwc_next", `/join-crew?token=${encodeURIComponent(token)}`);
    void navigate({ to: "/login" });
  };

  async function accept(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const { data, error } = await supabase.rpc("accept_crew_invite", {
      _token: token, _name: name, _phone: phone, _crew_role: crewRole,
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    setActiveWorkspaceId(Number(data));
    window.location.href = "/app/field";
  }

  return (
    <PublicLayout>
      <section className="contact-page wrap">
        <div className="contact-info">
          <span className="section-kicker">CREW INVITE</span>
          <h1>Join the crew.</h1>
          {info === undefined && <p>Checking your invite…</p>}
          {info === null && <p>This invite link is not valid. Ask your manager for a new one.</p>}
          {info && !info.valid && <p>This invite has expired or was already used. Ask your manager for a new link.</p>}
          {info?.valid && <p>You've been invited to join <strong>{info.workspace_name}</strong>.</p>}
          <p><Link to="/">Back to home</Link></p>
        </div>
        {info?.valid && (
          <div className="contact-form">
            {signedIn === false && (
              <>
                <p>First, sign in or create your account. You'll come right back here.</p>
                <button className="btn btn-primary" onClick={goLogin}>Sign in or create account</button>
              </>
            )}
            {signedIn && (
              <form onSubmit={accept} style={{ display: "grid", gap: 12 }}>
                <label>Your name<input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></label>
                <label>Phone<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
                <label>Your role
                  <select value={crewRole} onChange={(e) => setCrewRole(e.target.value)}>
                    <option value="driver">Driver</option>
                    <option value="helper">Helper</option>
                    <option value="crew_lead">Crew Lead</option>
                  </select>
                </label>
                <button className="btn btn-primary" disabled={busy}>{busy ? "Joining…" : "Join workspace"}</button>
                {msg && <p role="alert">{msg}</p>}
              </form>
            )}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
