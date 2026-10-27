import { createFileRoute } from "@tanstack/react-router";
import WorkspaceApp from "@/pages/app/WorkspaceApp";

export const Route = createFileRoute("/app/$")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your workspace — Northwest Moving Crew" },
      { name: "description", content: "Leads, estimates, dispatch, crew and billing for Northwest Moving Crew." },
      { property: "og:title", content: "Your workspace — Northwest Moving Crew" },
      { property: "og:description", content: "Leads, estimates, dispatch, crew and billing for Northwest Moving Crew." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkspaceApp,
});
