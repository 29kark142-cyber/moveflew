import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/Home";

const title = "MoveFlew — Precision Moving CRM & Conflict-Free Dispatch";
const desc = "MoveFlew connects lead capture, automated distance pricing, proposal deposits, visual dispatch and mobile crews—without the enterprise price tag. Start free beta access.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://manus-to-makeover.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://manus-to-makeover.lovable.app/" }],
  }),
  component: Home,
});
