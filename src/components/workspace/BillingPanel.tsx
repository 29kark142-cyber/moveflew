import { useEffect, useState } from "react";
import { CreditCard, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Workspace } from "@/lib/crm";

type Plan = { id: string; name: string; description: string; price_cents: number; billing_interval: string; trial_days: number; features: unknown; available: boolean };

const STATUS: Record<string, string> = {
  beta: "Free beta", trialing: "Free trial", active: "Active", past_due: "Payment past due", canceled: "Canceled",
};

export default function BillingPanel({ workspace }: { workspace: Workspace }) {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  useEffect(() => {
    supabase.from("subscription_plans").select("id,name,description,price_cents,billing_interval,trial_days,features,available")
      .order("sort_order").then(({ data }) => setPlans((data as Plan[]) ?? []));
  }, []);
  const admin = workspace.role === "admin";
  return (
    <section className="ws-card" style={{ padding: 20 }}>
      <h2 style={{ display: "flex", gap: 8, alignItems: "center" }}><CreditCard size={18} /> Billing & plan</h2>
      <p>Status: <strong>{STATUS[workspace.subscriptionStatus ?? "beta"]}</strong></p>
      {!admin && <p>Only workspace admins can change the plan.</p>}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", marginTop: 12 }}>
        {(plans ?? []).map((p) => {
          const current = p.id === workspace.planId;
          const features = Array.isArray(p.features) ? (p.features as string[]) : [];
          return (
            <div key={p.id} className="ws-card" style={{ padding: 16, outline: current ? "2px solid var(--primary)" : undefined }}>
              <h3>{p.name}</h3>
              <p style={{ fontSize: 22, fontWeight: 700 }}>
                {p.price_cents ? `$${(p.price_cents / 100).toFixed(0)}/${p.billing_interval === "year" ? "yr" : "mo"}` : "Free"}
              </p>
              <p style={{ fontSize: 13 }}>{p.description}</p>
              {p.trial_days > 0 && <p style={{ fontSize: 13 }}>{p.trial_days}-day free trial</p>}
              <ul style={{ fontSize: 13, paddingLeft: 0, listStyle: "none" }}>
                {features.map((f) => <li key={f}><Check size={12} /> {f}</li>)}
              </ul>
              {current ? <span className="ws-pill">Current plan</span>
                : <button className="ws-btn" disabled title="Paid plans open after the beta">{p.available ? "Choose plan" : "Coming soon"}</button>}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 13, opacity: 0.75, marginTop: 12 }}>
        During the beta every workspace has full access for free — no card needed. Payment methods and invoices will be managed here once paid plans launch.
      </p>
    </section>
  );
}
