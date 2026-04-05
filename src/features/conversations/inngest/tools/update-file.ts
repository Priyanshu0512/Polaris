import { createTool } from "@inngest/agent-kit";

import { convex } from "@/lib/convex-client";
import z from "zod";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";

interface UpdateFileToolOptions {
  internalKey: string;
}

const paramSchema = z.object({
  fileId: z.string().min(1, "File ID is required"),
  content: z.string(),
});

export const createUpdateFileTool = ({
  internalKey,
}: UpdateFileToolOptions) => {
  return createTool({
    name: "updateFile",
    description: "Update the content of  existing file in the project.",
    parameters: z.object({
      fileId: z.array(z.string()).describe("The Id of the file to be updated"),
      content: z.string().describe("thenew content for the file."),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramSchema.safeParse(params);
      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { fileId, content } = parsed.data;

      const file = await convex.query(api.system.getFileById, {
        internalKey,
        fileId: fileId as Id<"files">,
      });

      if (!file) {
        return `Error: File with Id "${fileId}" not found. Use listFiles to get valid file IDs.`;
      }

      if (file.type === "folder") {
        return `Error: "${fileId}" is a folder, not a file. You can only update file contents.`;
      }

      try {
        return await toolStep?.run("update-file", async () => {
          await convex.mutation(api.system.updateFile, {
            internalKey,
            fileId: fileId as Id<"files">,
            content,
          });
          return `File "${file.name}" updated successfully.`;
        });
      } catch (error) {
        return `Error updating file: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
};
