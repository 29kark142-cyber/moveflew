import { createFileRoute, Link } from "@tanstack/react-router";
import PublicLayout from "@/components/PublicLayout";

// Holding page for every /app/* link until the workspace is migrated to Lovable Cloud.
export const Route = createFileRoute("/app/$")({
  head: () => ({
    meta: [
      { title: "Your workspace — Northwest Moving Crew" },
      { name: "description", content: "The Northwest Moving Crew workspace is being moved to its new home." },
      { property: "og:title", content: "Your workspace — Northwest Moving Crew" },
      { property: "og:description", content: "The Northwest Moving Crew workspace is being moved to its new home." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkspaceComingSoon,
});

function WorkspaceComingSoon() {
  return (
    <PublicLayout>
      <section className="page-heading wrap" style={{ paddingBlock: 120 }}>
        <span className="section-kicker">YOUR WORKSPACE IS ON THE WAY</span>
        <h1>We're moving your workspace.</h1>
        <p>Leads, estimates, dispatch and crew tools will open here once the move is finished.</p>
        <Link to="/contact" className="btn btn-blue">
          Contact the crew
        </Link>
      </section>
    </PublicLayout>
  );
}
