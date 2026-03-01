import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { demoError, demoGenerate } from "@/inngest/function";
import { processMessage } from "@/features/conversations/inngest/process-messages";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    /* your functions will be passed here later! */
    demoGenerate,
    demoError,
    processMessage,
  ],
});
