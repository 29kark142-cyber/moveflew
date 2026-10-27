import { useState } from "react";
import { Link } from "@/lib/wouter";
import {
  ArrowRight,
  Check,
  Truck,
  UserRound,
  UsersRound,
  Package,
  Clock3,
} from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { DEFAULT_PRICING, money } from "@shared/crm";
import { moverCount, useI18n } from "@/lib/i18n";

const crews = [
  {
    n: 1,
    Icon: UserRound,
    label: "A helping hand",
    desc: "Careful lifting, loading, and unloading. You bring the truck.",
    features: [
      "1 professional mover",
      "No truck included",
      "Loading & unloading help",
    ],
  },
  {
    n: 2,
    Icon: Truck,
    label: "Your everyday move",
    desc: "The right-sized crew for apartments and smaller moves.",
    features: [
      "2 professional movers",
      "Moving truck included",
      "Careful loading & transport",
    ],
  },
  {
    n: 3,
    Icon: UsersRound,
    label: "Room for more",
    desc: "More hands for larger homes and heavier furniture.",
    features: [
      "3 professional movers",
      "Moving truck included",
      "Whole-home moving support",
    ],
  },
];

export default function Pricing() {
  const { t, locale } = useI18n();
  const [crew, setCrew] = useState(2);
  const [hours, setHours] = useState(2.5);
  const [packing, setPacking] = useState(false);
  const rate = DEFAULT_PRICING.rates[crew - 1];
  const formatNumber = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  return (
    <PublicLayout>
      <section className="page-heading wrap">
        <span className="section-kicker">{t("CLEAR, SIMPLE MOVING RATES")}</span>
        <h1>
          {t("Know what to expect.")}
          <br />
          <span>{t("Before we arrive.")}</span>
        </h1>
        <p>
          {t("Choose the help that fits your move. Straightforward hourly pricing for Chicago and the Northwest Suburbs.")}
        </p>
        <span className="minimum-tag">
          <Clock3 size={16} />
          {t("Minimum order: 2.5 hours")}
        </span>
      </section>
      <section className="rate-cards wrap">
        {crews.map(({ n, Icon, label, desc, features }) => (
          <article className={n === 2 ? "featured" : ""} key={n}>
            {n === 2 && (
              <div className="popular-label">{t("A GREAT PLACE TO START")}</div>
            )}
            <Icon size={28} />
            <span>{t(label)}</span>
            <h2>
              {moverCount(n)}
              {n > 1 && <small>{t("+ truck")}</small>}
            </h2>
            <div className="rate-price">
              {money(DEFAULT_PRICING.rates[n - 1])}
              <small>{t("/ hour")}</small>
            </div>
            <p>{t(desc)}</p>
            <ul>
              {features.map(feature => (
                <li key={feature}>
                  <Check size={16} />
                  {t(feature)}
                </li>
              ))}
            </ul>
            <Link
              href="/contact"
              className={`btn ${n === 2 ? "btn-blue" : "btn-outline"}`}
            >
              {t("Choose this crew")} <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </section>
      <section className="calculator-section wrap">
        <div>
          <span className="section-kicker">{t("A CREW THAT FITS YOUR DAY")}</span>
          <h2>
            {t("A little help.")}
            <br />
            {t("Or the whole crew.")}
          </h2>
          <p>
            {t("Choose from one to six movers and see your estimated labor cost. Travel time, materials, and additional services may apply.")}
          </p>
          <div className="full-rate-guide">
            {DEFAULT_PRICING.rates.map((r, i) => (
              <span key={r}>
                <b>{moverCount(i + 1)}</b>
                {money(r)}{t("/hr")}
              </span>
            ))}
          </div>
        </div>
        <div className="rate-calculator">
          <h3>{t("Plan your moving help")}</h3>
          <label>
            {t("Crew size")}
            <select
              value={crew}
              aria-label={t("Crew size")}
              onChange={e => setCrew(+e.target.value)}
            >
              {DEFAULT_PRICING.rates.map((r, i) => (
                <option value={i + 1} key={i}>
                  {t("{movers} · {truck} · {rate}/hour", {
                    movers: moverCount(i + 1),
                    truck: i === 0 ? t("no truck") : t("truck"),
                    rate: money(r),
                  })}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Estimated hours")}
            <input
              type="number"
              min="2.5"
              max="48"
              step="0.5"
              value={hours}
              onChange={e => setHours(Math.max(2.5, Number(e.target.value)))}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={packing}
              onChange={e => setPacking(e.target.checked)}
            />
            {t("Add standard packing help ($85/hour)")}
          </label>
          <div className="calculator-total">
            <span>
              {t("Estimated labor")}
              <small>
                {t("{movers} · {hours} hours", {
                  movers: moverCount(crew),
                  hours: formatNumber(hours),
                })}
              </small>
            </span>
            <strong>{money((rate + (packing ? 85 : 0)) * hours)}</strong>
          </div>
          <small className="calculator-disclaimer">
            {t("Planning estimate only. This is not a confirmed booking or final quote.")}
          </small>
          <Link href="/contact" className="btn btn-blue">
            {t("Request your quote")} <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <section className="packing-banner wrap">
        <span>
          <Package size={36} />
        </span>
        <div>
          <h2>{t("Good packing makes a great start.")}</h2>
          <p>
            {t("Standard packing and unpacking starts at")}{" "}
            <strong>{money(85)}{t("/hour")}</strong>. {t("Fragile, heavy, or specialty items? Let’s talk about the right approach.")}
          </p>
        </div>
        <Link href="/contact" className="text-link">
          {t("Ask about packing")} <ArrowRight size={17} />
        </Link>
      </section>
    </PublicLayout>
  );
}
