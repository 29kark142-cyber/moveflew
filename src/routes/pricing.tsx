import { createFileRoute } from "@tanstack/react-router";
import Pricing from "@/pages/Pricing";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Clear moving rates — Northwest Moving Crew" },
      { name: "description", content: "Transparent hourly moving rates for Chicago and the northwest suburbs." },
      { property: "og:title", content: "Clear moving rates — Northwest Moving Crew" },
      { property: "og:description", content: "Transparent hourly moving rates for Chicago and the northwest suburbs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});
