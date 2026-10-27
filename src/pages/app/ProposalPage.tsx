import Brand from "@/components/Brand";
import SignaturePad from "@/components/workspace/SignaturePad";
import { formatDate, LoadingBlock } from "@/components/workspace/WorkspaceUI";
import { crm } from "@/lib/crm";
import { calculateQuote, money, weight } from "@shared/crm";
import { CheckCircle2, CircleAlert, MapPin, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getLocale, moverCount, useI18n } from "@/lib/i18n";
import "@/workspace.css";

export default function ProposalPage() {
  const { t } = useI18n();
  const token = useMemo(
    () => window.location.pathname.split("/").filter(Boolean).pop() || "",
    []
  );
  const [data, setData] = useState<Awaited<
    ReturnType<typeof crm.proposal>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        setData(await crm.proposal(token));
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "This proposal could not be found or is no longer available."
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const submit = async () => {
    if (!signature || !accepted) return;
    setSaving(true);
    setError("");
    try {
      await crm.signProposal(token, signature);
      setSigned(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We couldn't save your signature. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="ws-proposal-page">
        <div className="ws-proposal">
          <LoadingBlock label={t("Loading your estimate…")} />
        </div>
      </div>
    );
  if (error && !data)
    return (
      <div className="ws-proposal-page">
        <div className="ws-public-error">
          <CircleAlert size={26} />
          <h1>{t("Proposal unavailable")}</h1>
          <p>{t(error)}</p>
        </div>
      </div>
    );
  if (!data) return null;
  const { job, company, pricing, tariff } = data;
  const base =
    job.pricingMode === "hourly"
      ? job.hourlyRate * Math.max(pricing.minimumHours, job.estimatedHours)
      : weight(job.inventory) * job.weightRate +
        job.distanceMiles * job.mileRate;
  const total =
    job.total ??
    calculateQuote(
      {
        pricingMode: job.pricingMode,
        hourlyRate: job.hourlyRate,
        estimatedHours: job.estimatedHours,
        distanceMiles: job.distanceMiles,
        travelFee: job.travelFee,
        weightRate: job.weightRate,
        mileRate: job.mileRate,
        inventory: job.inventory,
        fees: job.fees,
      },
      pricing.minimumHours
    );
  const baseWithFees =
    Math.round(
      (base +
        job.travelFee +
        job.fees.reduce((sum, fee) => sum + fee.amount, 0)) *
        100
    ) / 100;
  const pricingAdjustment = Math.round((total - baseWithFees) * 100) / 100;
  const moveDay = new Date(`${job.moveDate}T12:00:00`).getDay();
  const adjustedMinutes = Math.round(job.startHour * 60);
  const arrivalTime = new Intl.DateTimeFormat(getLocale(), {
    hour: "numeric",
    minute: "2-digit",
  }).format(
    new Date(2026, 0, 1, Math.floor(adjustedMinutes / 60), adjustedMinutes % 60)
  );

  return (
    <div className="ws-proposal-page">
      <article className="ws-proposal">
        <header className="ws-proposal__head">
          <div>
            <Brand light />
            <p>{t("Moving estimate · #{id}", { id: job.id })}</p>
          </div>
          <LanguageSwitcher className="ws-language-switcher--proposal" />
          <div className="ws-proposal__company">
            <b>{company.name}</b>
            <small>
              {company.phone}
              <br />
              {company.email}
            </small>
          </div>
        </header>
        <main className="ws-proposal__body">
          <div className="ws-proposal__intro">
            <div>
              <span className="ws-eyebrow">{t("Prepared for")}</span>
              <h1>{job.customerName}</h1>
              <p>
                {t(
                  "Thank you for considering {company}. This estimate is based on the move details below.",
                  { company: company.name }
                )}
              </p>
            </div>
            <div className="ws-proposal__date">
              <span>{t("Move date")}</span>
              <b>
                {formatDate(job.moveDate, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </b>
              <small>{arrivalTime}</small>
            </div>
          </div>
          <div className="ws-proposal__details">
            <section>
              <h3>
                <MapPin size={14} /> {t("Pickup")}
              </h3>
              <p>{job.origin || t("Address to be confirmed")}</p>
              {job.originNotes && <small>{job.originNotes}</small>}
            </section>
            <section>
              <h3>
                <MapPin size={14} /> {t("Delivery")}
              </h3>
              <p>{job.destination || t("Address to be confirmed")}</p>
              {job.destinationNotes && <small>{job.destinationNotes}</small>}
            </section>
          </div>
          <section className="ws-proposal__breakdown">
            <div className="ws-card-title">
              <div>
                <h2>{t("Estimate breakdown")}</h2>
                <p>
                  {job.pricingMode === "hourly"
                    ? t("{crew} · {hours} estimated hours", {
                        crew: moverCount(job.crewSize),
                        hours: Math.max(
                          pricing.minimumHours,
                          job.estimatedHours
                        ),
                      })
                    : t("{weight} lb inventory · {miles} miles", {
                        weight: weight(job.inventory),
                        miles: job.distanceMiles,
                      })}
                </p>
              </div>
            </div>
            <div className="ws-quote-lines">
              {tariff ? (
                tariff.lines.map(line => (
                  <div key={line.key}>
                    <span>{line.description}</span>
                    <strong>{money(line.amountCents / 100)}</strong>
                  </div>
                ))
              ) : (
                <>
                  <div>
                    <span>
                      {job.pricingMode === "hourly"
                        ? t("Labor ({rate}/hour)", {
                            rate: money(job.hourlyRate),
                          })
                        : t("Weight and distance service")}
                    </span>
                    <strong>{money(base)}</strong>
                  </div>
                  {job.travelFee > 0 && (
                    <div>
                      <span>{t("Route travel fee")}</span>
                      <strong>{money(job.travelFee)}</strong>
                    </div>
                  )}
                  {job.fees.map(fee => (
                    <div key={fee.name}>
                      <span>{fee.name}</span>
                      <strong>{money(fee.amount)}</strong>
                    </div>
                  ))}
                  {Math.abs(pricingAdjustment) >= 0.01 && (
                    <div>
                      <span>
                        {moveDay === 0 || moveDay === 6
                          ? t("Weekend pricing adjustment")
                          : t("Saved pricing adjustment")}
                      </span>
                      <strong>{money(pricingAdjustment)}</strong>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="ws-proposal__total">
              <span>
                <small>{t("Estimated total")}</small>
                <br />
                {t(
                  "Final billing may reflect recorded actual labor where applicable."
                )}
              </span>
              <b>{money(total)}</b>
            </div>
          </section>
          <section className="ws-proposal__terms">
            <h2>{t("Estimate terms")}</h2>
            <p>
              {t(
                "This estimate reflects the scope, route, and selected accessorials shown above. Changes to inventory, access conditions, dates, or services may change the final amount. Hourly moves are subject to the configured minimum of {hours} hours. This signed estimate records customer authorization; it is not presented as legal or regulatory advice.",
                { hours: pricing.minimumHours }
              )}
            </p>
          </section>
          {signed || job.signature ? (
            <div className="ws-proposal-signed">
              <CheckCircle2 size={24} />
              <div>
                <b>{t("Estimate accepted")}</b>
                <p>
                  {t(
                    "Thank you. Your signature has been recorded. The office will confirm your booking separately."
                  )}
                </p>
              </div>
            </div>
          ) : (
            <section className="ws-proposal__sign">
              <h2>{t("Accept this estimate")}</h2>
              <p>
                {t(
                  "Review the details, accept the terms, and sign below. A copy of the signature is saved with this proposal."
                )}
              </p>
              <SignaturePad
                onChange={setSignature}
                label={t("Customer signature")}
              />
              <label className="ws-checkbox">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={event => setAccepted(event.target.checked)}
                />
                <span>
                  {t(
                    "I have reviewed this estimate and accept the terms and authorization above."
                  )}
                </span>
              </label>
              {error && <div className="ws-error">{t(error)}</div>}
              <button
                className="ws-btn primary"
                disabled={!signature || !accepted || saving}
                onClick={() => void submit()}
              >
                <ShieldCheck size={15} />
                {saving ? t("Saving signature…") : t("Accept & sign estimate")}
              </button>
            </section>
          )}
        </main>
      </article>
    </div>
  );
}
