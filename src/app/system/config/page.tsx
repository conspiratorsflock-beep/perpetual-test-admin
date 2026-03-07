"use client";

import { useState } from "react";
import { Sliders, Eye, EyeOff, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConfigVar {
  key: string;
  value: string;
  isSecret: boolean;
  description: string;
}

const mockConfig: ConfigVar[] = [
  { key: "NODE_ENV", value: "production", isSecret: false, description: "Application environment" },
  { key: "NEXT_PUBLIC_APP_URL", value: "https://app.perpetualtest.com", isSecret: false, description: "Main app URL" },
  { key: "STRIPE_PUBLISHABLE_KEY", value: "pk_live_xxxxxxxxxxxx", isSecret: true, description: "Stripe public key" },
  { key: "SUPABASE_URL", value: "https://xxxx.supabase.co", isSecret: false, description: "Supabase project URL" },
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
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-100">System Configuration</h1>
        <p className="mt-1 text-sm text-slate-400">
          Environment variables and feature flag status.
        </p>
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
          {mockConfig.map((config) => (
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
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950">
              <span className="text-sm text-slate-300">new_dashboard</span>
              <Badge variant="outline" className="border-slate-700 text-slate-400">
                Disabled
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950">
              <span className="text-sm text-slate-300">api_v2</span>
              <Badge variant="outline" className="border-slate-700 text-slate-400">
                Disabled
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
