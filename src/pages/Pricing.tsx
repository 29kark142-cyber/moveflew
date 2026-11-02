import { Link } from "@/lib/wouter";
import {
  ArrowRight,
  Check,
  CreditCard,
  Map,
  Palette,
  PenLine,
  CalendarDays,
  Smartphone,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SaasLayout from "@/components/SaasLayout";
import { ComparisonHighlights, ComparisonMatrix } from "@/components/SmartMovingComparison";

const badge = "Free During Beta — Unlimited Users, No Credit Card Required, Zero Contracts.";

const plans = [
  {
    name: "Beta",
    price: "$0",
    interval: "/ month",
    tagline: "Every MoveFlew feature, free while we build in the open.",
    featured: true,
    cta: "Get Free Beta Access",
    points: [
      "Google Maps routing with travel and fuel line items",
      "Visual dispatch calendar with conflict prevention",
      "Offline field PWA with photos and job sign-off",
      "Digital Bill of Lading, waiver and inspection signatures",
      "White-label branding for your own proposals",
      "Unlimited users, leads, estimates and jobs",
    ],
  },
  {
    name: "Post-Beta Preview",
    price: "$99",
    interval: "/ month",
    tagline: "The flat-rate estimate for when beta closes. Not billed today.",
    featured: false,
    cta: "Claim Beta Pricing",
    points: [
      "Same full platform, all modules included",
      "Flat rate for unlimited users — no per-seat fees",
      "$0 setup fee, cancel anytime",
      "Beta companies keep priority onboarding",
      "Future pricing may change before launch",
    ],
  },
];

const comparison = [
  ["Current price", "$0 during beta", "$299–$399/month"],
  ["Expected price after beta", "$99/month flat", "$299–$399/month and up"],
  ["Setup fee", "$0", "Onboarding often charged separately"],
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
  return (
    <SaasLayout
      light
      footerNote="SmartMoving® is a registered trademark of SmartMoving Software, Inc. MoveFlew is an independent software platform and is not affiliated with, endorsed by, or sponsored by SmartMoving. Competitor pricing is drawn from publicly listed sources and is not independently verified; confirm current terms with the vendor."
    >
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
        <div className="saas-pricing-grid">
          {plans.map(({ name, price, interval, tagline, featured, cta, points }) => (
            <article className={featured ? "saas-pricing-card is-featured" : "saas-pricing-card"} key={name}>
              {featured && <span className="saas-pricing-flag">Most popular — start here</span>}
              <h2>{name}</h2>
              <p className="saas-pricing-tagline">{tagline}</p>
              <div className="saas-pricing-amount">
                <strong>{price}</strong>
                <span>{interval}</span>
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
                <Link href="/register">{cta} <ArrowRight /></Link>
              </Button>
            </article>
          ))}
        </div>
        <p className="saas-pricing-footnote">
          Beta access is free today. The $99/month figure is a post-beta preview and is not charged now;
          final pricing may change before launch. Stripe payment processing fees may apply to deposits.
        </p>
      </section>

      <section className="saas-wrap saas-pricing-compare">
        <span className="saas-eyebrow">PRICE COMPARISON</span>
        <h2>MoveFlew vs. SmartMoving</h2>
        <p className="saas-pricing-sub">
          What moving company owners usually ask before they switch: what it costs now, what it costs
          later, and how hard it is to get out.
        </p>
        <div className="saas-pricing-table" role="table" aria-label="MoveFlew versus SmartMoving pricing">
          <div className="saas-pricing-row saas-pricing-head" role="row">
            <strong role="columnheader">What you pay</strong>
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
          SmartMoving pricing is based on publicly listed figures and may change; confirm current terms
          with the vendor before deciding.
        </p>
      </section>

      <section className="saas-wrap saas-pricing-included">
        <div className="saas-pricing-heading">
          <div>
            <span className="saas-eyebrow">IN EVERY WORKSPACE</span>
            <h2>Nothing is held back for a higher tier.</h2>
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
    </SaasLayout>
  );
}
