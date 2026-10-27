import { createFileRoute } from "@tanstack/react-router";
import Platform from "@/pages/Platform";

export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title: "The platform — Northwest Moving Crew" },
      { name: "description", content: "See how sales, estimates, dispatch and crew connect in one moving workspace." },
      { property: "og:title", content: "The platform — Northwest Moving Crew" },
      { property: "og:description", content: "See how sales, estimates, dispatch and crew connect in one moving workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Platform,
});
