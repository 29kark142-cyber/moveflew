import { createFileRoute } from "@tanstack/react-router";
import Pricing from "@/pages/Pricing";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Clear moving rates — MoveFlew" },
      { name: "description", content: "Transparent hourly moving rates for your moving operation." },
      { property: "og:title", content: "Clear moving rates — MoveFlew" },
      { property: "og:description", content: "Transparent hourly moving rates for your moving operation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});
