"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { seedUnassignedTickets } from "@/lib/actions/support-tickets-seeding";
import { Loader2, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import type { TicketSeedingConfig, TicketSeedingResult } from "@/types/admin";

const CATEGORIES = [
  "bug_report",
  "feature_request",
  "billing",
  "technical",
  "account",
  "question",
  "other",
];

export function SeedTicketsButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TicketSeedingResult | null>(null);
  const [config, setConfig] = useState<TicketSeedingConfig>({
    strategy: "workload_balanced",
    respectSchedule: true,
    maxPerAgent: 5,
    categories: [],
  });

  async function handleSeed() {
    setLoading(true);
    setResult(null);
    try {
      const response = await seedUnassignedTickets(config);
      setResult(response);
    } catch (error) {
      setResult({
        seeded: 0,
        assignments: [],
        errors: [error instanceof Error ? error.message : "Failed to seed tickets"],
      });
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(cat: string) {
    setConfig((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Auto-Assign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Auto-Assign Unassigned Tickets</DialogTitle>
          <DialogDescription>
            Evenly distribute unassigned tickets to available agents based on
            your selected strategy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Assignment Strategy</Label>
            <Select
              value={config.strategy}
              onValueChange={(v) =>
                setConfig({
                  ...config,
                  strategy: v as TicketSeedingConfig["strategy"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round_robin">
                  Round Robin (simple rotation)
                </SelectItem>
                <SelectItem value="workload_balanced">
                  Workload Balanced (capacity-based)
                </SelectItem>
                <SelectItem value="skill_based">
                  Skill Based (category matching)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              {config.strategy === "round_robin" &&
                "Assigns tickets to agents in rotation, balancing by current workload."}
              {config.strategy === "workload_balanced" &&
                "Assigns tickets to agents with the most remaining capacity."}
              {config.strategy === "skill_based" &&
                "Matches tickets to agents based on category skills, then workload."}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Max Tickets Per Agent</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={config.maxPerAgent}
              onChange={(e) =>
                setConfig({
                  ...config,
                  maxPerAgent: parseInt(e.target.value) || 5,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Filter by Categories (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant={
                    config.categories.includes(cat) ? "default" : "outline"
                  }
                  className="cursor-pointer capitalize"
                  onClick={() => toggleCategory(cat)}
                >
                  {cat.replace("_", " ")}
                </Badge>
              ))}
            </div>
            {config.categories.length === 0 && (
              <p className="text-xs text-slate-500">
                Leave empty to include all categories
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="respectSchedule"
              checked={config.respectSchedule}
              onChange={(e) =>
                setConfig({ ...config, respectSchedule: e.target.checked })
              }
              className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
            />
            <Label htmlFor="respectSchedule" className="text-sm">
              Only assign to agents currently on-duty
            </Label>
          </div>
        </div>

        {result && (
          <div
            className={`p-3 rounded-lg ${
              result.seeded > 0 ? "bg-green-500/10" : "bg-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {result.seeded > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-400" />
              )}
              <span
                className={`font-medium ${
                  result.seeded > 0 ? "text-green-400" : "text-slate-300"
                }`}
              >
                {result.seeded} tickets assigned
              </span>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-2 text-sm text-red-400">
                {result.errors.length} errors occurred
              </div>
            )}
            {result.assignments.length > 0 && (
              <div className="mt-2 text-xs text-slate-400 max-h-24 overflow-y-auto">
                {result.assignments.slice(0, 5).map((a, i) => (
                  <div key={i}>
                    Ticket #{a.ticketId.slice(0, 8)}... → {a.agentName}
                  </div>
                ))}
                {result.assignments.length > 5 && (
                  <div>
                    +{result.assignments.length - 5} more assignments...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={handleSeed} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Assigning..." : "Auto-Assign Tickets"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
