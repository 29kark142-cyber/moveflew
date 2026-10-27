import { useState } from "react";
import { Link } from "@/lib/wouter";
import {
  ArrowRight,
  ArrowLeft,
  CalendarCheck,
  Play,
  Quote,
  ShieldCheck,
  CheckCircle2,
  Truck,
  BarChart3,
  FileX2,
  CalendarX2,
  TrendingUp,
  FileText,
  UsersRound,
  Calculator,
  Warehouse,
  ChevronRight,
  MessageSquare,
  X,
  Mail,
} from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/PublicLayout";
import ProductPreview from "@/components/ProductPreview";
import { useI18n } from "@/lib/i18n";

const benefits = [
  {
    text: "One place for every lead, estimate, truck, and crew. Less chasing details. More moving forward.",
    label: "ONE CONNECTED WORKSPACE",
  },
  {
    text: "Clear estimates, thoughtful planning, and a crew that knows exactly what comes next.",
    label: "BUILT FOR MOVING DAY",
  },
  {
    text: "From the first conversation to the final sign-off, keep every detail moving in the right direction.",
    label: "FROM FIRST BOX TO FINAL PLACEMENT",
  },
];
const features = [
  {
    Icon: TrendingUp,
    label: "Grow your\nbookings",
    href: "/app/leads",
    color: "blue",
  },
  {
    Icon: FileText,
    label: "Send clear\nestimates",
    href: "/app/estimates",
    color: "mint",
  },
  {
    Icon: Truck,
    label: "Simplify\ndispatch",
    href: "/app/dispatch",
    color: "cyan",
  },
  {
    Icon: UsersRound,
    label: "Connect\nyour crew",
    href: "/app/crew",
    color: "yellow",
  },
  {
    Icon: Calculator,
    label: "Keep billing\non track",
    href: "/app/invoices",
    color: "blue",
  },
  {
    Icon: Warehouse,
    label: "Manage\nyour fleet",
    href: "/app/fleet",
    color: "mint",
  },
  {
    Icon: BarChart3,
    label: "See the\nbigger picture",
    href: "/app/dashboard",
    color: "orange",
  },
];

export default function Home() {
  const { t } = useI18n();
  const [quote, setQuote] = useState(0);
  const [chat, setChat] = useState(false);
  return (
    <div className="home-page">
      <div className="hero-blue" />
      <PublicHeader hero />
      <main>
        <section className="hero wrap">
          <div className="hero-content">
            <div className="hero-eyebrow">
              <span /> {t("BUILT FOR THE WAY YOU MOVE")}
            </div>
            <h1>
              <span>{t("Crush the moving-day chaos.")}</span> <br />
              {t("With Northwest Crew.")}
            </h1>
            <p className="hero-description">
              {t(
                "A smarter way to manage every move. Connect your sales, estimates, dispatch, and crew in one easy-to-use workspace."
              )}
            </p>
            <div className="hero-proof">
              <div className="proof-seal">
                <ShieldCheck size={24} />
                <span>
                  {t("CARE IN")}
                  <br />
                  {t("EVERY MOVE")}
                </span>
              </div>
              <div className="proof-detail">
                <b>
                  <CheckCircle2 size={19} color="#0877eb" /> Northwest Crew
                </b>
                <small>CHICAGO & NORTHWEST SUBURBS</small>
                <span
                  className="proof-stars"
                  style={{
                    fontSize: 8,
                    letterSpacing: ".06em",
                    color: "#0877eb",
                  }}
                >
                  {t("CARE · CLARITY · CREW")}
                </span>
                <small className="proof-promise">
                  {t("Careful moves. Clear communication.")}
                </small>
              </div>
              <div className="proof-badge">
                <Truck size={14} />
                <strong>
                  {t("Moving &")}
                  <br />
                  {t("Delivery")}
                </strong>
                <small>{t("YOUR LOCAL CREW")}</small>
              </div>
            </div>
            <div className="hero-buttons">
              <Link href="/platform" className="btn btn-navy">
                <Play size={18} fill="currentColor" />
                {t("Take a quick tour")}
              </Link>
              <Link href="/app/dashboard" className="btn btn-cyan">
                <CalendarCheck size={20} />
                {t("Open your workspace")}
              </Link>
            </div>
            <div className="testimonial-strip">
              <button
                aria-label={t("Previous benefit")}
                onClick={() => setQuote((quote + 2) % 3)}
              >
                <ArrowLeft size={18} />
              </button>
              <Quote size={27} fill="currentColor" />
              <div>
                <p>{t(benefits[quote].text)}</p>
                <small>{t(benefits[quote].label)}</small>
              </div>
              <button
                aria-label={t("Next benefit")}
                onClick={() => setQuote((quote + 1) % 3)}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
          <ProductPreview />
        </section>
        <section className="trust-section wrap">
          <h2>
            {t(
              "One connected platform. A better day for everyone on your team."
            )}
          </h2>
          <div className="team-wordmarks">
            <span>
              <UsersRound />
              {t("SALES TEAM")}
            </span>
            <span>
              <FileText />
              {t("ESTIMATORS")}
            </span>
            <span>
              <CalendarCheck />
              {t("DISPATCH")}
            </span>
            <span>
              <Truck />
              {t("FIELD CREW")}
            </span>
            <span>
              <TrendingUp />
              {t("BUSINESS OWNERS")}
            </span>
          </div>
        </section>
        <section className="problem-section wrap">
          <h2>
            {t("You’re moving every day, but")}
            <br />
            <span>{t("the details shouldn’t slow you down.")}</span>
          </h2>
          <p className="section-intro">
            {t(
              "The calls. The spreadsheets. The last-minute schedule changes. Bring it all together with a workspace built around moving companies—not another tool to work around."
            )}
          </p>
          <div className="problem-columns">
            {[
              {
                Icon: BarChart3,
                title: "Scattered sales",
                text: "Leads in one place. Follow-ups in another. Keep every customer conversation and next step in view.",
                link: "/app/leads",
              },
              {
                Icon: FileX2,
                title: "Guesswork estimates",
                text: "Replace scattered calculations with clear pricing, visual inventory, and proposals your customers can sign.",
                link: "/app/estimates/new",
              },
              {
                Icon: CalendarX2,
                title: "Complicated operations",
                text: "See your trucks, your crew, and your day together. Spot scheduling conflicts before they become problems.",
                link: "/app/dispatch",
              },
            ].map(({ Icon, title, text, link }) => (
              <article key={title}>
                <span className="problem-icon">
                  <Icon size={26} />
                </span>
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
                <Link href={link} className="text-link">
                  {t("There’s a better way")}{" "}
                  <span>
                    <ChevronRight size={17} />
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </section>
        <section className="platform-section">
          <div className="wrap">
            <div className="platform-copy">
              <span className="section-kicker">
                {t("THE NORTHWEST CREW WORKSPACE")}
              </span>
              <h2>
                {t("Your entire moving business.")}
                <br />
                {t("One platform.")}
                <br />
                {t("One connected crew.")}
              </h2>
              <p>
                {t(
                  "From the first inquiry to the last box, bring sales, estimates, scheduling, crew management, and billing together. Spend less time switching tools—and more time moving your business forward."
                )}
              </p>
            </div>
            <span className="feature-note">
              {t("A place for every")}
              <br />
              {t("part of your day")} <span>⤵</span>
            </span>
            <div className="feature-cards">
              {features.map(({ Icon, label, href, color }) => (
                <Link href={href} key={label} className="feature-card">
                  <span className={`feature-icon ${color}`}>
                    <Icon size={35} />
                  </span>
                  <span>
                    {t(label)
                      .split("\n")
                      .map((line, i) => (
                        <span key={i}>
                          {line}
                          <br />
                        </span>
                      ))}
                  </span>
                  <ArrowRight className="feature-arrow" size={15} />
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="stories-section wrap">
          <h2>
            <span>{t("More clarity. Less busywork.")}</span>
            <br />
            {t("That’s the Northwest way.")}
          </h2>
          <div className="story-grid">
            {[
              {
                img: "/assets/northwest-moving.webp",
                title: "Make room for better moves",
                text: "Turn a new inquiry into a complete move plan, with customer details and follow-ups right where you need them.",
                link: "/app/leads",
                cta: "Explore sales",
              },
              {
                img: "/assets/northwest-packing.webp",
                title: "Every detail, accounted for",
                text: "Create a visual inventory, calculate your quote, and share a professional proposal in one connected workflow.",
                link: "/app/estimates/new",
                cta: "Build an estimate",
              },
              {
                img: "/assets/moving-day.webp",
                title: "Give your crew a clear plan",
                text: "Plan the day, assign your trucks and crew, and keep job details close at hand—at the office or on the move.",
                link: "/app/dispatch",
                cta: "Explore dispatch",
              },
            ].map(story => (
              <article key={story.title}>
                <img src={story.img} alt={t(story.title)} loading="lazy" />
                <h3>{t(story.title)}</h3>
                <p>{t(story.text)}</p>
                <Link href={story.link} className="text-link">
                  {t(story.cta)}
                  <span>
                    <ChevronRight size={17} />
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </section>
        <section className="bottom-cta wrap">
          <div>
            <span className="section-kicker">
              {t("YOUR NEXT MOVE STARTS HERE")}
            </span>
            <h2>{t("Put your whole day in motion.")}</h2>
            <p>{t("Your customers. Your crew. Your business. Connected.")}</p>
          </div>
          <Link href="/app/dashboard" className="btn btn-cyan">
            {t("Open your workspace")} <ArrowRight size={18} />
          </Link>
        </section>
      </main>
      <PublicFooter />
      {chat && (
        <div className="contact-popover">
          <button
            className="close"
            onClick={() => setChat(false)}
            aria-label={t("Close contact options")}
          >
            <X size={16} />
          </button>
          <strong>{t("Let’s talk about your next move.")}</strong>
          <p>
            {t(
              "Contact Northwest Moving Crew for moving help, service questions, and clear answers."
            )}
          </p>
          <a href="mailto:booking.movinghelp@gmail.com">
            <Mail size={16} />
            {t("Email the crew")}
          </a>
          <Link href="/contact">
            {t("Send an inquiry")} <ArrowRight size={15} />
          </Link>
        </div>
      )}
      <button
        className="chat-button"
        onClick={() => setChat(!chat)}
        aria-label={t("Contact Northwest Moving Crew")}
      >
        {chat ? <X /> : <MessageSquare />}
      </button>
    </div>
  );
}
