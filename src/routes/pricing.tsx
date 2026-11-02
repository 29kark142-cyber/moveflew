import { createFileRoute } from "@tanstack/react-router";
import { faqJsonLd } from "@/lib/moveflew-faq";
import Pricing from "@/pages/Pricing";

const title = "MoveFlew Pricing — Moving CRM Free During Beta";
const description =
  "MoveFlew is free during beta: every module, unlimited users, no credit card and no contract. Paid plans are announced to beta companies before beta closes.";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://moveflew.lovable.app/pricing" },
    ],
    scripts: [faqJsonLd()],
    links: [{ rel: "canonical", href: "https://moveflew.lovable.app/pricing" }],
  }),
  component: Pricing,
});
