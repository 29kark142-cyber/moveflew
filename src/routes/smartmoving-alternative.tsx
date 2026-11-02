import { createFileRoute } from "@tanstack/react-router";
import SmartMovingAlternative from "@/pages/SmartMovingAlternative";

const title = "SmartMoving Alternative — MoveFlew Free Beta Moving CRM";
const description =
  "Compare MoveFlew with SmartMoving: offline-first field app with e-signatures, flat $99/month pricing after a free beta, unlimited users, no annual contract, automated Google Maps mileage and fuel.";

export const Route = createFileRoute("/smartmoving-alternative")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://moveflew.lovable.app/smartmoving-alternative" },
    ],
    links: [
      { rel: "canonical", href: "https://moveflew.lovable.app/smartmoving-alternative" },
    ],
  }),
  component: SmartMovingAlternative,
});
