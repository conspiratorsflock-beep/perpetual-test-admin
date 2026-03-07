"use client";

import { useState, useEffect } from "react";
import { Megaphone, Plus, Calendar, Target, Trash2, Edit, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  toggleAnnouncementActive,
} from "@/lib/actions/announcements";
import type { AdminAnnouncement, AnnouncementType } from "@/types/admin";

const typeColors: Record<AnnouncementType, string> = {
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  maintenance: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AdminAnnouncement | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState<AnnouncementType>("info");
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

  const handleCreate = async () => {
    try {
      await createAnnouncement({
        title: formTitle,
        content: formContent,
        type: formType,
        startsAt: formStartsAt || new Date().toISOString(),
        endsAt: formEndsAt || null,
      });
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
        title: formTitle,
        content: formContent,
        type: formType,
        startsAt: formStartsAt,
        endsAt: formEndsAt || null,
      });
      setEditingAnnouncement(null);
      resetForm();
      loadAnnouncements();
    } catch (error) {
      console.error("Failed to update announcement:", error);
      alert("Failed to update announcement");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete announcement "${title}"?`)) return;
    try {
      await deleteAnnouncement(id);
      loadAnnouncements();
    } catch (error) {
      console.error("Failed to delete announcement:", error);
      alert("Failed to delete announcement");
    }
  };

  const handleToggleActive = async (announcement: AdminAnnouncement) => {
    try {
      await toggleAnnouncementActive(announcement.id, !announcement.isActive);
      loadAnnouncements();
    } catch (error) {
      console.error("Failed to toggle announcement:", error);
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormType("info");
    setFormStartsAt("");
    setFormEndsAt("");
  };

  const openEdit = (announcement: AdminAnnouncement) => {
    setEditingAnnouncement(announcement);
    setFormTitle(announcement.title);
    setFormContent(announcement.content);
    setFormType(announcement.type);
    setFormStartsAt(announcement.startsAt.slice(0, 16)); // Format for datetime-local
    setFormEndsAt(announcement.endsAt ? announcement.endsAt.slice(0, 16) : "");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

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
                <Input
                  className="bg-slate-950 border-slate-800"
                  placeholder="Announcement title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  className="bg-slate-950 border-slate-800"
                  placeholder="Announcement content..."
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as AnnouncementType)}>
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
                  <Label>Start Date</Label>
                  <Input
                    type="datetime-local"
                    className="bg-slate-950 border-slate-800"
                    value={formStartsAt}
                    onChange={(e) => setFormStartsAt(e.target.value)}
                  />
                </div>
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
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950"
                disabled={!formTitle || !formContent}
              >
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-slate-100">{announcement.title}</h3>
                      <Badge variant="outline" className={typeColors[announcement.type]}>
                        {announcement.type}
                      </Badge>
                      {announcement.isActive ? (
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-700 text-slate-500">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-400 whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Starts {formatDate(announcement.startsAt)}
                      </div>
                      {announcement.endsAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Ends {formatDate(announcement.endsAt)}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {announcement.targetTiers.length === 0
                          ? "All tiers"
                          : announcement.targetTiers.join(", ")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Active</span>
                      <Switch
                        checked={announcement.isActive}
                        onCheckedChange={() => handleToggleActive(announcement)}
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(announcement)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(announcement.id, announcement.title)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {announcements.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Megaphone className="h-8 w-8 mx-auto mb-3 text-slate-700" />
              <p>No announcements yet. Create one to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingAnnouncement} onOpenChange={() => setEditingAnnouncement(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                className="bg-slate-950 border-slate-800"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                className="bg-slate-950 border-slate-800"
                rows={4}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as AnnouncementType)}>
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
                <Label>Start Date</Label>
                <Input
                  type="datetime-local"
                  className="bg-slate-950 border-slate-800"
                  value={formStartsAt}
                  onChange={(e) => setFormStartsAt(e.target.value)}
                />
              </div>
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
            <Button variant="ghost" onClick={() => setEditingAnnouncement(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
