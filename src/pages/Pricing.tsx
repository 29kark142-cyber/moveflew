import { useState } from "react";
import MoveFlewFaq from "@/components/MoveFlewFaq";
import { Link } from "@/lib/wouter";
import {
  ArrowRight,
  Check,
  CreditCard,
  Map,
  Minus,
  Palette,
  PenLine,
  CalendarDays,
  PlayCircle,
  Smartphone,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SaasLayout from "@/components/SaasLayout";
import { ComparisonHighlights, ComparisonMatrix } from "@/components/SmartMovingComparison";
import { comparisonFooter } from "@/lib/smartmoving-comparison";

const badge = "Free During Beta — Unlimited Access, No Credit Card Required";

type Billing = "monthly" | "annual";
const plans = [
  {
    name: "Starter",
    monthly: 75,
    annual: 750,
    tagline: "For owner-operators and small crews getting organized.",
    featured: false,
    points: [
      "Up to 3 trucks and 10 crew members",
      "Core estimates and proposals",
      "Google Maps routing with travel and fuel pricing",
      "Dispatch board with conflict warnings",
      "100% offline field PWA with digital BOL signatures",
    ],
  },
  {
    name: "Pro",
    monthly: 100,
    annual: 1000,
    tagline: "For growing companies running multiple trucks every day.",
    featured: true,
    points: [
      "Everything in Starter, plus:",
      "Unlimited trucks and crew members",
      "Embeddable website booking widget",
      "Automated SMS & email alerts",
      "Full white-labeling with custom domains",
      "Warehouse & Storage Vault module",
    ],
  },
];

const tierMatrix: [string, boolean | string, boolean | string][] = [
  ["Trucks", "Up to 3", "Unlimited"],
  ["Crew members", "Up to 10", "Unlimited"],
  ["Estimates & proposals", true, true],
  ["Google Maps routing & fuel pricing", true, true],
  ["Dispatch board", true, true],
  ["Offline field PWA & digital BOL signatures", true, true],
  ["Website booking widget", false, true],
  ["Automated SMS & email alerts", false, true],
  ["White-labeling with custom domains", false, true],
  ["Warehouse & Storage Vault", false, true],
];

const comparison = [
  ["Price today", "Free during beta", "Paid plans, priced per tier"],
  ["Price after beta", "Announced before beta closes", "Tiered plans and annual contracts are common"],
  ["Setup fee", "None", "Onboarding often charged separately"],
  ["User pricing", "Unlimited users included", "Seats and tiers add cost"],
  ["Contract", "Cancel anytime, zero contracts", "Annual lock-ins are common"],
];

const included = [
  {
    Icon: Map,
    title: "Distance-priced estimates",
    text: "Routes calculate miles and drive time, then apply your travel and fuel rules as estimate line items.",
  },
  {
    Icon: CalendarDays,
    title: "Conflict-free dispatch",
    text: "A visual board warns about overlapping trucks and crews before a job is assigned.",
  },
  {
    Icon: Smartphone,
    title: "Offline field workspace",
    text: "Crews capture timestamps, photos and signatures on site, then sync when they reconnect.",
  },
  {
    Icon: PenLine,
    title: "Signed documents",
    text: "Bill of Lading, damage waiver and inspection checklist, delivered as a signed PDF.",
  },
  {
    Icon: Users,
    title: "Everyone on the crew",
    text: "Invite drivers, helpers and crew leads without paying for each seat.",
  },
  {
    Icon: Palette,
    title: "White-label branding",
    text: "Proposals and documents carry your company name and colors, not ours.",
  },
];

export default function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly");
  return (
    <SaasLayout light footerNote={comparisonFooter}>
      <section className="saas-wrap saas-pricing-hero">
        <span className="saas-eyebrow">PRICING</span>
        <h1>Enterprise Moving CRM without the Enterprise Price Tag.</h1>
        <p className="saas-pricing-intro">
          Lead capture, distance-priced estimates, signed proposals, conflict-free dispatch and a
          mobile crew workspace — one flat platform your whole team can use.
        </p>
        <div className="saas-pricing-badge" role="note">
          <CreditCard size={18} aria-hidden="true" />
          <span>{badge}</span>
        </div>
        <div className="saas-pricing-actions">
          <Button asChild size="lg">
            <Link href="/register">Get Free Beta Access <ArrowRight /></Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/vs-smartmoving">Compare vs. SmartMoving</Link>
          </Button>
        </div>
        <small className="saas-pricing-footnote">
          Free beta access. No credit card, no contract, no setup fee.
        </small>
      </section>

      <section className="saas-wrap saas-pricing-plans">
        <div className="saas-billing-toggle" role="group" aria-label="Billing period">
          <button type="button" aria-pressed={billing === "monthly"} onClick={() => setBilling("monthly")}>Monthly</button>
          <button type="button" aria-pressed={billing === "annual"} onClick={() => setBilling("annual")}>Annual</button>
          <span className="saas-billing-save">2 Months Free on Annual Plans</span>
        </div>
        <div className="saas-pricing-grid">
          {plans.map(({ name, monthly, annual, tagline, featured, points }) => (
            <article className={featured ? "saas-pricing-card is-featured" : "saas-pricing-card"} key={name}>
              {featured && <span className="saas-pricing-flag">Most Popular</span>}
              <h2>{name}</h2>
              <p className="saas-pricing-tagline">{tagline}</p>
              <div className="saas-pricing-amount">
                <strong>${billing === "monthly" ? monthly : annual.toLocaleString("en-US")}</strong>
                <span>{billing === "monthly" ? "/mo" : "/yr"}</span>
              </div>
              <ul className="saas-pricing-points">
                {points.map(point => (
                  <li key={point}>
                    <Check size={16} aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" variant={featured ? "default" : "outline"} className="saas-pricing-cta">
                <Link href="/register">Start Free Beta <ArrowRight /></Link>
              </Button>
            </article>
          ))}
        </div>
        <p className="saas-pricing-footnote">
          Every plan is free during beta with no credit card. Paid billing begins after beta; beta
          companies get notice before anything is charged.
        </p>
      </section>

      <section className="saas-wrap saas-pricing-compare saas-tier-matrix">
        <span className="saas-eyebrow">COMPARE PLANS</span>
        <h2>Starter vs. Pro</h2>
        <div className="saas-pricing-table" role="table" aria-label="Starter versus Pro features">
          <div className="saas-pricing-row saas-pricing-head" role="row">
            <strong role="columnheader">Feature</strong>
            <strong role="columnheader">Starter</strong>
            <strong role="columnheader">Pro</strong>
          </div>
          {tierMatrix.map(([label, starter, pro]) => (
            <div className="saas-pricing-row" role="row" key={label}>
              <strong role="rowheader">{label}</strong>
              {[starter, pro].map((v, i) => (
                <span role="cell" data-column={i ? "Pro" : "Starter"} key={i}>
                  {v === true ? <><Check size={16} aria-label="Included" /></> : v === false ? <Minus size={16} className="saas-tier-no" aria-label="Not included" /> : v}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="saas-wrap saas-pricing-compare">
        <span className="saas-eyebrow">PLAN COMPARISON</span>
        <h2>MoveFlew vs. SmartMoving</h2>
        <p className="saas-pricing-sub">
          What moving company owners usually ask before they switch: what it costs now, what it costs
          later, and how hard it is to get out.
        </p>
        <div className="saas-pricing-table" role="table" aria-label="MoveFlew versus SmartMoving plans">
          <div className="saas-pricing-row saas-pricing-head" role="row">
            <strong role="columnheader">What you're comparing</strong>
            <strong role="columnheader">MoveFlew</strong>
            <strong role="columnheader">SmartMoving</strong>
          </div>
          {comparison.map(([label, moveflew, competitor]) => (
            <div className="saas-pricing-row" role="row" key={label}>
              <strong role="rowheader">{label}</strong>
              <span role="cell" data-column="MoveFlew">
                <Check size={16} aria-hidden="true" />
                {moveflew}
              </span>
              <span role="cell" data-column="SmartMoving">{competitor}</span>
            </div>
          ))}
        </div>
        <p className="saas-pricing-footnote">
          SmartMoving plan terms are based on publicly available information and may change; confirm
          current terms with the vendor before deciding.
        </p>
      </section>

      <section className="saas-wrap saas-alt-matrix">
        <div className="saas-pricing-heading">
          <div>
            <span className="saas-eyebrow">FEATURE &amp; CAPABILITY MATRIX</span>
            <h2>What you get beyond the price.</h2>
          </div>
          <p>
            The six things that decide a move: what the crew can do without signal, what it costs per
            user, how documents get signed and sent, whose brand is on them, how miles and fuel get
            priced, and how tenant data is kept apart.
          </p>
        </div>
        <ComparisonMatrix />
        <p className="saas-pricing-footnote">
          MoveFlew describes this product as built today. Competitor values are based on publicly
          available information and are not independently verified.
        </p>
        <div className="saas-pricing-actions saas-alt-more">
          <Button asChild size="lg" variant="outline">
            <Link href="/smartmoving-alternative">
              See the full SmartMoving comparison <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/demo/proposal">
              <PlayCircle size={18} aria-hidden="true" /> View Live Demo
            </Link>
          </Button>
        </div>
        <ComparisonHighlights />
      </section>

      <section className="saas-wrap saas-pricing-included">
        <div className="saas-pricing-heading">
          <div>
            <span className="saas-eyebrow">IN EVERY WORKSPACE</span>
            <h2>Included in every workspace.</h2>
          </div>
          <p>
            The beta includes the modules most CRMs sell as add-ons, so you can run a full move
            without switching tools.
          </p>
        </div>
        <div className="saas-pricing-features">
          {included.map(({ Icon, title, text }) => (
            <article className="saas-pricing-feature" key={title}>
              <span className="saas-pricing-feature-icon"><Icon size={20} aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="saas-wrap saas-pricing-closing">
        <div>
          <span className="saas-eyebrow">GET STARTED</span>
          <h2>Try it on your next move.</h2>
          <p>Create a workspace, invite your crew and run a real job. Free during beta.</p>
        </div>
        <Button asChild size="lg">
          <Link href="/register">Get Free Beta Access <ArrowRight /></Link>
        </Button>
      </section>
      <MoveFlewFaq />
    </SaasLayout>
  );
}
