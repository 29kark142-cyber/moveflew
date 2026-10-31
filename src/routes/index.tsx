import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/Home";

const title = "Northwest Crew — Moving CRM with Free Beta Access";
const desc = "Moving CRM built for fast operations without the enterprise price tag. Connect web leads, distance pricing, proposal deposits, dispatch and mobile crews.";

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
