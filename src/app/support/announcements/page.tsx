"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/dev-auth/client";
import { Megaphone, Plus, Calendar, Target, Trash2, Edit, Loader2, RotateCcw, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  expireAnnouncementNow,
} from "@/lib/actions/announcements";
import { clearAllDismissals } from "@/lib/shared/admin-banner";
import type { AdminAnnouncement, AnnouncementType } from "@/types/admin";

const typeColors: Record<AnnouncementType, string> = {
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  maintenance: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

function getAnnouncementStatus(a: AdminAnnouncement): "active" | "scheduled" | "expired" {
  const now = new Date();
  const startsAt = new Date(a.startsAt);
  if (startsAt > now) return "scheduled";
  if (a.endsAt) {
    const endsAt = new Date(a.endsAt);
    if (endsAt < now) return "expired";
  }
  return "active";
}

const statusColors = {
  active: "border-emerald-500/30 text-emerald-400",
  scheduled: "border-blue-500/30 text-blue-400",
  expired: "border-slate-700 text-slate-500",
};

export default function AnnouncementsPage() {
  const { user } = useUser();
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AdminAnnouncement | null>(null);

  const [formMessage, setFormMessage] = useState("");
  const [formStyle, setFormStyle] = useState<AnnouncementType>("info");
  const [formTier, setFormTier] = useState("all");
  const [formOrgId, setFormOrgId] = useState("");
  const [formLinkUrl, setFormLinkUrl] = useState("");
  const [formLinkText, setFormLinkText] = useState("");
  const [formStartsAt, setFormStartsAt] = useState("");
  const [formEndsAt, setFormEndsAt] = useState("");

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    setIsLoading(true);
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error("Failed to load announcements:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const resetForm = () => {
    setFormMessage("");
    setFormStyle("info");
    setFormTier("all");
    setFormOrgId("");
    setFormLinkUrl("");
    setFormLinkText("");
    setFormStartsAt("");
    setFormEndsAt("");
  };

  const handleCreate = async () => {
    if (!user?.id) {
      alert("You must be logged in to create announcements");
      return;
    }
    try {
      await createAnnouncement(
        {
          message: formMessage,
          style: formStyle,
          tier: formTier,
          orgId: formOrgId || null,
          linkUrl: formLinkUrl || null,
          linkText: formLinkText || null,
          startsAt: formStartsAt ? new Date(formStartsAt).toISOString() : new Date().toISOString(),
          endsAt: formEndsAt ? new Date(formEndsAt).toISOString() : null,
        },
        user.id
      );
      setIsCreateOpen(false);
      resetForm();
      loadAnnouncements();
    } catch (error) {
      console.error("Failed to create announcement:", error);
      alert("Failed to create announcement");
    }
  };

  const handleUpdate = async () => {
    if (!editingAnnouncement) return;
    try {
      await updateAnnouncement(editingAnnouncement.id, {
        message: formMessage,
        style: formStyle,
        tier: formTier,
        orgId: formOrgId || null,
        linkUrl: formLinkUrl || null,
        linkText: formLinkText || null,
        startsAt: formStartsAt ? new Date(formStartsAt).toISOString() : undefined,
        endsAt: formEndsAt ? new Date(formEndsAt).toISOString() : null,
      });
      setEditingAnnouncement(null);
      resetForm();
      loadAnnouncements();
    } catch (error) {
      console.error("Failed to update announcement:", error);
      alert("Failed to update announcement");
    }
  };

  const handleDelete = async (id: string, message: string) => {
    if (!confirm(`Delete announcement "${message.slice(0, 50)}..."?`)) return;
    try {
      await deleteAnnouncement(id);
      loadAnnouncements();
    } catch (error) {
      console.error("Failed to delete announcement:", error);
      alert("Failed to delete announcement");
    }
  };

  const handleExpire = async (id: string) => {
    if (!confirm("Expire this announcement now? It will no longer be shown.")) return;
    try {
      await expireAnnouncementNow(id);
      loadAnnouncements();
    } catch (error) {
      console.error("Failed to expire announcement:", error);
    }
  };

  const openEdit = (announcement: AdminAnnouncement) => {
    setEditingAnnouncement(announcement);
    setFormMessage(announcement.message);
    setFormStyle(announcement.style);
    setFormTier(announcement.tier);
    setFormOrgId(announcement.orgId || "");
    setFormLinkUrl(announcement.linkUrl || "");
    setFormLinkText(announcement.linkText || "");
    const toLocalDateTime = (isoString: string): string => {
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    setFormStartsAt(toLocalDateTime(announcement.startsAt));
    setFormEndsAt(announcement.endsAt ? toLocalDateTime(announcement.endsAt) : "");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  const AnnouncementForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea
          className="bg-slate-950 border-slate-800"
          placeholder="Announcement message..."
          rows={4}
          value={formMessage}
          onChange={(e) => setFormMessage(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Style</Label>
          <Select value={formStyle} onValueChange={(v) => setFormStyle(v as AnnouncementType)}>
            <SelectTrigger className="bg-slate-950 border-slate-800">
              <SelectValue />
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
          <Label>Tier</Label>
          <Select value={formTier} onValueChange={setFormTier}>
            <SelectTrigger className="bg-slate-950 border-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Trial Active</SelectItem>
              <SelectItem value="soft_locked">Soft Locked</SelectItem>
              <SelectItem value="hard_locked">Hard Locked</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Org ID (optional)</Label>
        <Input
          className="bg-slate-950 border-slate-800"
          placeholder="org_xxx — leave blank for all orgs"
          value={formOrgId}
          onChange={(e) => setFormOrgId(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Link URL (optional)</Label>
          <Input
            className="bg-slate-950 border-slate-800"
            placeholder="https://..."
            value={formLinkUrl}
            onChange={(e) => setFormLinkUrl(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Link Text (optional)</Label>
          <Input
            className="bg-slate-950 border-slate-800"
            placeholder="Learn more"
            value={formLinkText}
            onChange={(e) => setFormLinkText(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input
            type="datetime-local"
            className="bg-slate-950 border-slate-800"
            value={formStartsAt}
            onChange={(e) => setFormStartsAt(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>End Date (optional)</Label>
          <Input
            type="datetime-local"
            className="bg-slate-950 border-slate-800"
            value={formEndsAt}
            onChange={(e) => setFormEndsAt(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => { setIsCreateOpen(false); setEditingAnnouncement(null); }}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950"
          disabled={!formMessage}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Announcements</h1>
          <p className="mt-1 text-sm text-slate-400">Create and manage platform announcements.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (!confirm("Reset all dismissed announcements?\n\nThis will clear the dismissal state in this browser.")) return;
              clearAllDismissals();
              alert("Dismissals cleared. Announcements will appear immediately.");
            }}
            className="border-slate-700 text-slate-300 hover:text-slate-100"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Dismissals
          </Button>
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
              <AnnouncementForm onSubmit={handleCreate} submitLabel="Create" />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const status = getAnnouncementStatus(announcement);
            return (
              <Card key={announcement.id} className="bg-slate-900 border-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className={typeColors[announcement.style]}>
                          {announcement.style}
                        </Badge>
                        <Badge variant="outline" className={statusColors[status]}>
                          {status === "active" ? "Active" : status === "scheduled" ? "Scheduled" : "Expired"}
                        </Badge>
                        {announcement.tier !== "all" && (
                          <Badge variant="outline" className="border-slate-700 text-slate-400">
                            {announcement.tier}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-slate-300 whitespace-pre-wrap">
                        {announcement.message}
                      </p>
                      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Starts {formatDate(announcement.startsAt)}
                        </div>
                        {announcement.endsAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Ends {formatDate(announcement.endsAt)}
                          </div>
                        )}
                        {announcement.orgId && (
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            Org {announcement.orgId.slice(0, 12)}...
                          </div>
                        )}
                        {announcement.linkUrl && (
                          <a
                            href={announcement.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:text-amber-300"
                          >
                            {announcement.linkText || "Link"} →
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {status === "active" && (
                        <Button variant="ghost" size="sm" onClick={() => handleExpire(announcement.id)}>
                          Expire
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(announcement)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(announcement.id, announcement.message)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {announcements.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Megaphone className="h-8 w-8 mx-auto mb-3 text-slate-700" />
              <p>No announcements yet. Create one to get started.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!editingAnnouncement} onOpenChange={() => setEditingAnnouncement(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
          </DialogHeader>
          <AnnouncementForm onSubmit={handleUpdate} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
