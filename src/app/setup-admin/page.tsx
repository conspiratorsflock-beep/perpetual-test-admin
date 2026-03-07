"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { promoteUserToAdminByEmail, setupEmergencyAdmin } from "@/lib/actions/setup-admin";

export default function SetupAdminPage() {
  const [email, setEmail] = useState("butteredpeanuts@gmail.com");
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const result = await promoteUserToAdminByEmail(email);
      setResult(result);
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencySetup = async () => {
    setIsLoading(true);
    try {
      const result = await setupEmergencyAdmin();
      setResult(result);
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Admin Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-400">
            Use this page to promote a user to admin. This bypasses the normal
            admin check and should only be used for initial setup.
          </p>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">
              User Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100"
            />
          </div>

          <Button
            onClick={handleSetup}
            disabled={isLoading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950"
          >
            {isLoading ? "Setting up..." : "Promote to Admin"}
          </Button>

          <Button
            onClick={handleEmergencySetup}
            disabled={isLoading}
            variant="outline"
            className="w-full border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            Emergency: Setup butteredpeanuts@gmail.com
          </Button>

          {result && (
            <div
              className={`p-3 rounded-md text-sm ${
                result.success
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {result.message}
            </div>
          )}

          {result?.success && (
            <p className="text-xs text-slate-500 text-center">
              Refresh http://localhost:3001 to access the admin console
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
