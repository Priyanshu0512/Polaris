import { inngest } from "@/inngest/client";

// Opt out of caching; every request should send a new event
export const dynamic = "force-dynamic";

// Create a simple async Next.js API route handler
export async function POST() {
  // Send your event payload to Inngest
  await inngest.send({
    name: "demo/generate",
    data: {},
  });

  return Response.json({ status: "started" });
}
