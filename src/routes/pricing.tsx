import { createFileRoute } from "@tanstack/react-router";
import Pricing from "@/pages/Pricing";

const title = "MoveFlew Pricing — Free Beta Moving CRM, $99/mo After Beta";
const description =
  "MoveFlew pricing: free during beta with unlimited users, no credit card and no contract. Flat $99/month after beta versus SmartMoving at $299-$399/month.";

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
    links: [{ rel: "canonical", href: "https://moveflew.lovable.app/pricing" }],
  }),
  component: Pricing,
});
