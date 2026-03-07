"use client";

import { useState } from "react";
import { Megaphone, Plus, Calendar, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AnnouncementType } from "@/types/admin";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  targetTiers: string[];
  isActive: boolean;
  startsAt: string;
}

const mockAnnouncements: Announcement[] = [
  {
    id: "1",
    title: "Scheduled Maintenance",
    content: "We will be performing scheduled maintenance on March 15th.",
    type: "maintenance",
    targetTiers: [],
    isActive: true,
    startsAt: "2024-03-10",
  },
];

const typeColors: Record<AnnouncementType, string> = {
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  maintenance: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function AnnouncementsPage() {
  const [announcements] = useState<Announcement[]>(mockAnnouncements);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Announcements</h1>
          <p className="mt-1 text-sm text-slate-400">
            Create and manage platform announcements.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950">
              <Plus className="mr-2 h-4 w-4" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input className="bg-slate-950 border-slate-800" placeholder="Announcement title" />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  className="bg-slate-950 border-slate-800"
                  placeholder="Announcement content..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select>
                    <SelectTrigger className="bg-slate-950 border-slate-800">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Tiers</Label>
                  <Select>
                    <SelectTrigger className="bg-slate-950 border-slate-800">
                      <SelectValue placeholder="All tiers" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="free">Free Only</SelectItem>
                      <SelectItem value="paid">Paid Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-100">{announcement.title}</h3>
                    <Badge variant="outline" className={typeColors[announcement.type]}>
                      {announcement.type}
                    </Badge>
                    {announcement.isActive && (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{announcement.content}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Starts {announcement.startsAt}
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {announcement.targetTiers.length === 0
                        ? "All tiers"
                        : announcement.targetTiers.join(", ")}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {announcements.length === 0 && (
          <div className="text-center py-12 text-slate-500">No announcements yet.</div>
        )}
      </div>
    </div>
  );
}
