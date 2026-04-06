import { WebContainer } from "@webcontainer/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFiles } from "@/features/projects/hooks/use-files";
import { buildFileTree, getFilePath } from "../utils/file-tree";

/** Split a simple shell command into binary + args (no quoted strings). */
const parseCommand = (command: string): [string, string[]] => {
  const parts = command.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return ["npm", ["install"]];
  }
  const [bin, ...args] = parts;
  return [bin, args];
};

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

const getWebcontainer = async (): Promise<WebContainer> => {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }
  if (!bootPromise) {
    bootPromise = WebContainer.boot({ coep: "credentialless" });
  }
  webcontainerInstance = await bootPromise;
  return webcontainerInstance;
};

const teardownWebcontainer = async () => {
  if (webcontainerInstance) {
    webcontainerInstance.teardown();
    webcontainerInstance = null;
  }
  bootPromise = null;
};

interface UseWbContainerProps {
  projectId: Id<"projects">;
  enabled: boolean;
  settings?: {
    installCommand?: string;
    devCommand?: string;
  };
}

export const useWebContainer = ({
  projectId,
  enabled,
  settings,
}: UseWbContainerProps) => {
  const [status, setStatus] = useState<
    "idle" | "booting" | "installing" | "running" | "error"
  >("idle");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restartKey, setRestartKey] = useState(0);
  const [terminalOutput, setTerminalOutput] = useState("");

  const containerRef = useRef<WebContainer | null>(null);
  const hasStartedRef = useRef(false);

  const files = useFiles(projectId);

  useEffect(() => {
    if (!enabled || !files || files.length === 0 || hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;
    const start = async () => {
      try {
        setStatus("booting");
        setError(null);
        setTerminalOutput("");
        const appendOutput = (data: string) => {
          setTerminalOutput((prev) => prev + data);
        };
        const container = await getWebcontainer();
        containerRef.current = container;
        const fileTree = buildFileTree(files);
        await container.mount(fileTree);
        container.on("server-ready", (_port, url) => {
          setPreviewUrl(url);
          setStatus("running");
        });
        setStatus("installing");

        const installCmd = settings?.installCommand || "npm install";
        const [installBin, ...installArgs] = installCmd.split(" ");
        appendOutput(`$ ${installCmd}\n`);
        const installProcess = await container.spawn(installBin, installArgs);

        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              appendOutput(data);
            },
          }),
        );
        const installExitCode = await installProcess.exit;
        if (installExitCode !== 0) {
          throw new Error(`${installCmd} failed with code ${installExitCode}`);
          return;
        }
        const devCmd = settings?.devCommand || "npm run dev";
        const [devBin, ...devArgs] = devCmd.split(" ");
        appendOutput(`$ ${devCmd}\n`);
        const devProcess = await container.spawn(devBin, devArgs);
        devProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              appendOutput(data);
            },
          }),
        );
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unknown error");
        setStatus("error");
      }
    };
    start();
  }, [
    enabled,
    files,
    restartKey,
    settings?.devCommand,
    settings?.installCommand,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !files || status !== "running") return;
    const fileMap = new Map(files.map((f) => [f._id, f]));

    for (const file of files) {
      if (file.type !== "file" || file.storageId || !file.content) continue;
      const filePath = getFilePath(file, fileMap);
      container.fs.writeFile(`/${filePath}`, file.content);
    }
  }, [files, status]);

  useEffect(() => {
    if (!enabled) {
      hasStartedRef.current = false;
      setStatus("idle");
      setPreviewUrl(null);
      setError(null);
    }
  }, [enabled]);

  const restart = useCallback(() => {
    teardownWebcontainer();
    containerRef.current = null;
    hasStartedRef.current = false;
    setStatus("idle");
    setPreviewUrl(null);
    setError(null);
    setRestartKey((prev) => prev + 1);
  }, []);

  return {
    status,
    previewUrl,
    error,
    terminalOutput,
    restart,
  };
};
