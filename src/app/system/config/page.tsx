"use client";

import { useState, useEffect } from "react";
import { Sliders, Eye, EyeOff, Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getFeatureFlags } from "@/lib/actions/feature-flags";
import type { FeatureFlag } from "@/types/admin";

interface ConfigVar {
  key: string;
  value: string;
  isSecret: boolean;
  description: string;
}

// These are safe to display - no actual secrets
const configVars: ConfigVar[] = [
  {
    key: "NODE_ENV",
    value: process.env.NODE_ENV || "development",
    isSecret: false,
    description: "Application environment mode",
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    value: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
    isSecret: false,
    description: "Admin console URL",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    value: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/https:\/\//, "").replace(/\.supabase\.co.*/, "***") || "Not configured",
    isSecret: false,
    description: "Supabase project (masked)",
  },
  {
    key: "STRIPE_SECRET_KEY",
    value: process.env.STRIPE_SECRET_KEY ? "sk_***" + process.env.STRIPE_SECRET_KEY.slice(-4) : "Not configured",
    isSecret: true,
    description: "Stripe secret key (masked)",
  },
  {
    key: "MAIN_APP_URL",
    value: process.env.MAIN_APP_URL || "Not configured",
    isSecret: false,
    description: "Main Perpetual Test app URL",
  },
];

function MaskedValue({ value, isSecret }: { value: string; isSecret: boolean }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isSecret) return <span className="font-mono text-slate-300">{value}</span>;

  const displayValue = show ? value : "•".repeat(Math.min(value.length, 20));

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-slate-300">{displayValue}</span>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShow(!show)}>
        {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </Button>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy}>
        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}

export default function SystemConfigPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFlags();
  }, []);

  async function loadFlags() {
    setIsLoading(true);
    try {
      const data = await getFeatureFlags();
      setFlags(data);
    } catch (error) {
      console.error("Failed to load feature flags:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">System Configuration</h1>
          <p className="mt-1 text-sm text-slate-400">
            Environment variables and feature flag status.
          </p>
        </div>
        <Button variant="outline" onClick={loadFlags} disabled={isLoading} className="border-slate-700">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* Environment Variables */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            Environment Variables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {configVars.map((config) => (
            <div key={config.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-slate-300 font-mono text-sm">{config.key}</Label>
                {config.isSecret && (
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">
                    Secret
                  </Badge>
                )}
              </div>
              <div className="p-3 rounded-md bg-slate-950 border border-slate-800">
                <MaskedValue value={config.value} isSecret={config.isSecret} />
              </div>
              <p className="text-xs text-slate-500">{config.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Feature Flags Status */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400">Feature Flags Status</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : (
            <div className="space-y-2">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950"
                >
                  <div>
                    <span className="text-sm text-slate-300 font-mono">{flag.key}</span>
                    <p className="text-xs text-slate-500">{flag.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {flag.enabledForOrgs.length > 0 && `${flag.enabledForOrgs.length} orgs`}
                      {flag.enabledForUsers.length > 0 && `${flag.enabledForUsers.length} users`}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        flag.enabledGlobally
                          ? "border-emerald-500/30 text-emerald-400"
                          : "border-slate-700 text-slate-400"
                      }
                    >
                      {flag.enabledGlobally ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              ))}
              {flags.length === 0 && (
                <p className="text-center py-4 text-slate-500">No feature flags configured.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-400">System Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Next.js Version</span>
              <p className="text-slate-300">16.1.6</p>
            </div>
            <div>
              <span className="text-slate-500">React Version</span>
              <p className="text-slate-300">19.0.0</p>
            </div>
            <div>
              <span className="text-slate-500">TypeScript</span>
              <p className="text-slate-300">5.8.2</p>
            </div>
            <div>
              <span className="text-slate-500">Tailwind CSS</span>
              <p className="text-slate-300">4.0.9</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
