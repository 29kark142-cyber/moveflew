import { useState, type ReactNode } from "react";
import { Link } from "@/lib/wouter";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import MoveGridBrand from "@/components/MoveGridBrand";

export default function SaasLayout({ children, footerNote, light = false }: { children: ReactNode; footerNote?: string; light?: boolean }) {
  const [menu, setMenu] = useState(false);
  return <div className={light ? "saas-site mf-home" : "saas-site"}>
    <div className="saas-announcement"><span>Free beta access. Built for moving companies.</span><Link href="/register">Join the beta <ArrowRight size={14} /></Link></div>
    <header className="saas-header">
      <div className="saas-wrap saas-navigation">
        <div className="saas-brand"><MoveGridBrand /><small>MOVING OPERATIONS CRM</small></div>
        <nav aria-label="Main navigation" className={menu ? "saas-menu is-open" : "saas-menu"}>
          <Link href="/" onClick={() => setMenu(false)}>Moving CRM</Link>
          <Link href="/pricing" onClick={() => setMenu(false)}>Pricing</Link>
          <Link href="/vs-smartmoving" onClick={() => setMenu(false)}>Compare vs. SmartMoving</Link>
          <Link href="/login" onClick={() => setMenu(false)}>Log in</Link>
        </nav>
        <Button asChild className="saas-nav-cta"><Link href="/register">Start Free Beta Access <ArrowRight /></Link></Button>
        <Button variant="ghost" size="icon" className="saas-menu-toggle" aria-label={menu ? "Close navigation" : "Open navigation"} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</Button>
      </div>
    </header>
    <main>{children}</main>
    <footer className="saas-footer"><div className="saas-wrap"><div><MoveGridBrand /><p>Moving company software. One connected crew.</p></div><nav aria-label="Footer navigation"><Link href="/register">Join the beta</Link><Link href="/pricing">Pricing</Link><Link href="/vs-smartmoving">Compare vs. SmartMoving</Link><Link href="/login">Log in</Link><Link href="/privacy">Privacy Policy</Link></nav><small>© {new Date().getFullYear()} MoveFlew</small></div>{footerNote && <p className="saas-wrap saas-comparison-note">{footerNote}</p>}</footer>
  </div>;
}