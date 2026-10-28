import MobileField from "@/components/workspace/MobileField";
import CopilotAssistant from "@/components/workspace/CopilotAssistant";
import { useAuth } from "@/_core/hooks/useAuth";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import { ErrorNotice, LoadingBlock } from "@/components/workspace/WorkspaceUI";
import {
  crm,
  CrmApiError,
  setWorkspaceId,
  type Bootstrap,
  type Workspace,
} from "@/lib/crm";
import "@/workspace.css";
import { Building2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "@/lib/wouter";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  expandedPages,
  DocumentPage,
  WorkerDetailPage,
} from "../extended/module-routes";
import {
  DashboardPage,
  DispatchPage,
  EstimateWizardPage,
  EstimatesPage,
  FieldPage,
  FleetPage,
  InvoicesPage,
  JobDetailPage,
  JobsPage,
  LeadsPage,
  SettingsPage,
} from "./WorkspaceViews";

function CreateWorkspace({
  onCreated,
}: {
  onCreated: (workspace: Workspace) => Promise<void>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onCreated(await crm.createWorkspace(name.trim()));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not create this workspace."
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="workspace">
      <main className="ws-onboard">
        <div className="ws-onboard__mark">
          <Building2 size={22} />
        </div>
        <LanguageSwitcher className="ws-language-switcher--onboard" />
        <h1>{t("Set up your workspace")}</h1>
        <p>
          {t(
            "Your workspace starts empty. Add the team and moving records you need—no demo customers are created."
          )}
        </p>
        <form onSubmit={submit}>
          <label>
            {t("Workspace name")}
            <input
              className="ws-input"
              autoFocus
              required
              minLength={2}
              placeholder={t("e.g. Northwest Moving Crew")}
              value={name}
              onChange={event => setName(event.target.value)}
            />
          </label>
          {error && <div className="ws-error">{t(error)}</div>}
          <button className="ws-btn primary" disabled={saving || !name.trim()}>
            <Plus size={15} />
            {saving ? t("Creating…") : t("Create workspace")}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function WorkspaceApp() {
  const { t } = useI18n();
  const [location, navigate] = useLocation();
  const { user, loading: authLoading, logout } = useAuth();
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: Bootstrap;
      try {
        data = await crm.bootstrap();
      } catch (reason) {
        if (!(reason instanceof CrmApiError) || reason.status !== 403)
          throw reason;
        setWorkspaceId(null);
        data = await crm.bootstrap();
      }
      setBootstrap(data);
      setWorkspaceId(data.workspace?.id ?? null);
    } catch (reason) {
      setError(reason);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    void load();
  }, [authLoading, load, navigate, user]);

  useEffect(() => {
    if (location === "/app" || location === "/app/") navigate("/app/dashboard");
  }, [location, navigate]);

  const chooseWorkspace = async (id: number) => {
    setWorkspaceId(id);
    await load();
  };
  const createWorkspace = async (workspace: Workspace) => {
    setWorkspaceId(workspace.id);
    await load();
  };

  if (authLoading || (!user && !error))
    return (
      <div className="workspace">
        <LoadingBlock label={t("Checking your sign-in…")} />
      </div>
    );
  if (!user)
    return (
      <div className="workspace">
        <LoadingBlock label={t("Opening sign-in…")} />
      </div>
    );
  if (loading)
    return (
      <div className="workspace">
        <LoadingBlock label={t("Opening your workspace…")} />
      </div>
    );
  if (error)
    return (
      <div className="workspace">
        <main className="ws-content">
          <ErrorNotice error={error} retry={() => void load()} />
        </main>
      </div>
    );
  if (!bootstrap || !bootstrap.workspace)
    return <CreateWorkspace onCreated={createWorkspace} />;

  const pageProps = {
    role: bootstrap.workspace.role,
    navigate,
    path: location,
  };
  let page: React.ReactNode;
  const ExpandedPage = expandedPages[location];
  // The dispatch board shares the calendar's live job list, so booked jobs appear immediately.
  if (location === "/app/dispatch") page = <DispatchPage {...pageProps} />;
  else if (ExpandedPage) page = <ExpandedPage {...pageProps} />;
  else if (/^\/app\/workers\/\d+\/?$/.test(location))
    page = <WorkerDetailPage {...pageProps} />;
  else if (/^\/app\/jobs\/\d+\/bol\/?$/.test(location))
    page = <DocumentPage {...pageProps} />;
  else if (location === "/app/dashboard")
    page = <DashboardPage {...pageProps} />;
  else if (location === "/app/leads") page = <LeadsPage {...pageProps} />;
  else if (location === "/app/estimates/new")
    page = <EstimateWizardPage {...pageProps} />;
  else if (location === "/app/estimates")
    page = <EstimatesPage {...pageProps} />;
  else if (location.match(/^\/app\/jobs\/\d+$/))
    page = <JobDetailPage {...pageProps} />;
  else if (location === "/app/jobs") page = <JobsPage {...pageProps} />;
  else if (location === "/app/calendar") page = <DispatchPage {...pageProps} />;
  else if (location === "/app/fleet" || location === "/app/crew")
    page = <FleetPage {...pageProps} />;
  else if (location === "/app/field")
    page =
      bootstrap.workspace.role === "estimator" ? (
        <div className="ws-alert">
          {t(
            "Field job sheets are available to dispatch, office admins, and assigned crew members."
          )}
        </div>
      ) : (
        <MobileField role={bootstrap.workspace.role} />
      );
  else if (location === "/app/invoices") page = <InvoicesPage {...pageProps} />;
  else if (location === "/app/settings") page = <SettingsPage {...pageProps} />;
  else if (location === "/app/settings/integrations")
    page = <SettingsPage key="integrations" {...pageProps} integrationsTab />;
  else page = <DashboardPage {...pageProps} />;

  return (
    <WorkspaceShell
      path={location}
      navigate={navigate}
      user={user}
      role={bootstrap.workspace.role}
      workspace={bootstrap.workspace}
      workspaces={bootstrap.workspaces}
      onWorkspace={id => void chooseWorkspace(id)}
      onLogout={() => void logout()}
    >
      <div key={`${bootstrap.workspace.id}-${location}`}>{page}</div>
      <CopilotAssistant key={`copilot-${bootstrap.workspace.id}`} path={location} navigate={navigate} />
    </WorkspaceShell>
  );
}
