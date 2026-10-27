import { defineTool } from "@lovable.dev/mcp-js";

const info = {
  phone: "(224) 313-0604",
  email: "booking.movinghelp@gmail.com",
  serviceArea: "Chicago & Northwest Suburbs",
};

export default defineTool({
  name: "get_contact_info",
  title: "Get contact info",
  description: "Return Northwest Moving Crew's public phone, email and service area.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: `Phone: ${info.phone}\nEmail: ${info.email}\nService area: ${info.serviceArea}` }],
    structuredContent: { ...info },
  }),
});
