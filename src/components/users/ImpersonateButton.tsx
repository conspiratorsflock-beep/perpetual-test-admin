"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generateImpersonationToken } from "@/lib/actions/impersonation";

interface ImpersonateButtonProps {
  userId: string;
  userEmail: string;
}

export function ImpersonateButton({ userId, userEmail }: ImpersonateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const newToken = await generateImpersonationToken(userId);
      setToken(newToken);
    } catch (error) {
      console.error("Failed to generate token:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImpersonate = () => {
    // Open main app with impersonation token
    // The main app middleware should handle token validation
    const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3000";
    window.open(`${mainAppUrl}/api/impersonate?token=${token}`, "_blank");
  };

  const handleClose = () => {
    setIsOpen(false);
    setToken(null);
    setCopied(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
        >
          <UserCircle className="mr-2 h-4 w-4" />
          Impersonate
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Impersonate User</DialogTitle>
          <DialogDescription className="text-slate-400">
            Generate a temporary token to sign in as {userEmail}. The token expires in 30 minutes.
          </DialogDescription>
        </DialogHeader>

        {!token ? (
          <div className="py-6">
            <p className="text-sm text-slate-400 mb-4">
              This will create a secure, one-time token that allows you to access the main application
              as this user. Your actions will be logged for security purposes.
            </p>
            <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-xs text-amber-400">
                <strong>Warning:</strong> Only impersonate users for legitimate support or debugging purposes.
                All impersonation activity is audited.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-2 block">
                Impersonation Token (copy this)
              </label>
              <div className="flex gap-2">
                <code className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 font-mono break-all">
                  {token}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="border-slate-700 hover:bg-slate-800"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              This token can only be used once and expires in 30 minutes.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            {token ? "Close" : "Cancel"}
          </Button>
          {!token ? (
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              {isLoading ? "Generating..." : "Generate Token"}
            </Button>
          ) : (
            <Button
              onClick={handleImpersonate}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open as User
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
