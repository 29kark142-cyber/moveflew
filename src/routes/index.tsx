import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/Home";

const title = "Northwest Moving Crew — Every move, connected";
const desc = "One workspace for leads, estimates, dispatch and crew. Careful moves across Chicago and the northwest suburbs.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});
