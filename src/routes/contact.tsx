import { createFileRoute } from "@tanstack/react-router";
import Contact from "@/pages/Contact";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact the crew — Northwest Moving Crew" },
      { name: "description", content: "Call, email or send a request to plan your next move with Northwest Moving Crew." },
      { property: "og:title", content: "Contact the crew — Northwest Moving Crew" },
      { property: "og:description", content: "Call, email or send a request to plan your next move with Northwest Moving Crew." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});
