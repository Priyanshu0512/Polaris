"use client";

import { Button } from "@/components/ui/button";
import { use, useState } from "react";

import * as Sentry from "@sentry/nextjs";
import { useAuth } from "@clerk/nextjs";
export default function DemoPage() {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const handleblocking = async () => {
    setLoading(true);
    await fetch("/api/demo/blocking", { method: "POST" });
    setLoading(false);
  };

  const handleclientError = () => {
    Sentry.logger.info(`Client error button clicked.8 ${userId}`);
    throw new Error("Client Error: Something went wrong in the browser ");
  };

  const handleApiError = async () => {
    await fetch("/api/demo/error", { method: "POST" });
  };

  const handleInngestError = async () => {
    await fetch("api/demo/inngest-error", { method: "POST" });
  };

  return (
    <div className="p-8 space-x-4">
      <Button variant={"outline"} onClick={handleblocking}>
        {loading ? "Loading..." : "Blocked"}
      </Button>
      <Button variant={"destructive"} onClick={handleclientError}>
        Client Error
      </Button>
      <Button variant={"destructive"} onClick={handleApiError}>
        API Error
      </Button>
      <Button variant={"destructive"} onClick={handleInngestError}>
        Inngest Error
      </Button>
    </div>
  );
}
