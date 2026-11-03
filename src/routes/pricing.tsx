import { createFileRoute } from "@tanstack/react-router";
import { faqJsonLd } from "@/lib/moveflew-faq";
import Pricing from "@/pages/Pricing";

const title = "MoveFlew Pricing — Moving CRM Free During Beta";
const description =
  "MoveFlew moving CRM pricing: Starter $75/mo and Pro $100/mo, 2 months free yearly. Free during beta, no credit card required.";

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
