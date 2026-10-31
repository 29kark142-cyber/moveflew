import { Link } from "@/lib/wouter";
import { ArrowRight, Check, Code2, Route, FileSignature, CalendarDays, Smartphone, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SaasLayout from "@/components/SaasLayout";
import operationsHero from "@/assets/crm-operations-hero.jpg";

const features = [
  { Icon: Code2, name: "Instant Web Lead Capture & Embeddable Widgets", text: "Connect your website, embedded quote forms, and inbound webhooks. New website leads land in your workspace pipeline.", tone: "capture" },
  { Icon: Route, name: "Google Maps Distance, Travel & Fuel Surcharge Engine", text: "Turn pickup and drop-off addresses into route distance and driving time. Apply your workspace’s travel and fuel pricing rules.", tone: "pricing" },
  { Icon: FileSignature, name: "Digital Proposals with Stripe Deposit Collection", text: "Share a customer-ready proposal, collect a digital signature, and take a deposit with your default rules or an office override.", tone: "proposals" },
  { Icon: CalendarDays, name: "Visual Dispatch Calendar with Overlap Prevention", text: "See booked jobs, assign trucks and crews, and catch overlapping assignments before they disrupt the day.", tone: "dispatch" },
  { Icon: Smartphone, name: "Mobile Field App for Crews & Digital Sign-Offs", text: "Keep assigned jobs, move-day progress, inspection photos, customer signatures, and final payment close at hand.", tone: "field" },
];

export default function Home() {
  return <SaasLayout>
    <section className="saas-hero">
      <img className="saas-hero-image" src={operationsHero} width={1920} height={1024} alt="Moving trucks and crew at a dispatch depot" fetchPriority="high" />
      <div className="saas-wrap saas-hero-content">
        <span className="saas-eyebrow"><span className="saas-status-dot" /> NORTHWEST CREW · MOVING CRM</span>
        <h1>The Moving CRM Built for Fast Operations <span>— Without the Enterprise Price Tag.</span></h1>
        <p>Streamline lead capture, automated distance pricing, proposal deposits, conflict-free dispatch, and mobile crew management in one clean platform.</p>
        <div className="saas-hero-actions">
          <Button asChild size="lg"><Link href="/register">Start Free Beta Access <ArrowRight /></Link></Button>
          <Button asChild variant="outline" size="lg"><Link href="/vs-smartmoving">Compare vs. SmartMoving <ChevronRight /></Link></Button>
        </div>
        <div className="saas-beta-details"><span><Check size={15} /> Free during beta</span><span><Check size={15} /> No credit card required</span></div>
      </div>
      <div className="saas-hero-caption">From the office to the last box. Connected.</div>
    </section>
    <section className="saas-workflow"><div className="saas-wrap"><span>ONE WORKSPACE. EVERY STAGE.</span><div>{["Capture", "Price", "Book", "Dispatch", "Complete"].map((stage, index) => <div key={stage}><small>0{index + 1}</small><strong>{stage}</strong>{index < 4 && <ArrowRight size={17} />}</div>)}</div></div></section>
    <section className="saas-features saas-wrap">
      <div className="saas-section-heading"><div><span className="saas-eyebrow">LESS BUSYWORK. MORE MOVING.</span><h2>Your moving operations.<br />All moving together.</h2></div><p>From the first website inquiry to the final customer sign-off, give your office and field crew one connected workflow.</p></div>
      <div className="saas-feature-grid">{features.map(({ Icon, name, text, tone }, index) => <article className={`saas-feature saas-feature-${tone}`} key={name}><div className="saas-feature-top"><span className="saas-feature-icon"><Icon size={24} /></span><small>0{index + 1}</small></div><h3>{name}</h3><p>{text}</p></article>)}<div className="saas-feature-invite"><span className="saas-eyebrow">BUILT FOR YOUR NEXT MOVE</span><h3>A clearer day starts with a connected crew.</h3><Button asChild><Link href="/register">Start Free Beta Access <ArrowRight /></Link></Button><small>No credit card required.</small></div></div>
    </section>
    <section className="saas-closing"><div className="saas-wrap"><div><span className="saas-eyebrow">YOUR OPERATIONS. WITHOUT THE OVERHEAD.</span><h2>Make your next move a smarter one.</h2><p>Bring your team into Northwest Crew with free beta access.</p></div><Button asChild size="lg"><Link href="/register">Start Free Beta Access <ArrowRight /></Link></Button></div></section>
  </SaasLayout>;
}
