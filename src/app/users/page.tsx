"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Users, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UserTable } from "@/components/users/UserTable";
import { UserSearch } from "@/components/users/UserSearch";
import { searchUsers, toggleUserAdmin, deleteUser, createUser, inviteUser } from "@/lib/actions/users";
import type { AdminUser } from "@/types/admin";

const PAGE_SIZE = 25;

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialTab = searchParams.get("tab") || "all";

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);

  // Add User Dialog State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Parameters<typeof searchUsers>[0] = {
        query: query || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };

      if (activeTab === "admins") {
        params.isAdmin = true;
      }

      const result = await searchUsers(params);
      setUsers(result.users);
      setTotal(result.total);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [query, page, activeTab]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    setPage(1);
    // Update URL
    const params = new URLSearchParams(searchParams);
    if (newQuery) {
      params.set("q", newQuery);
    } else {
      params.delete("q");
    }
    router.push(`/users?${params.toString()}`);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (tab !== "all") {
      params.set("tab", tab);
    } else {
      params.delete("tab");
    }
    router.push(`/users?${params.toString()}`);
  };

  const handleToggleAdmin = async (userId: string, makeAdmin: boolean) => {
    if (!confirm(`Are you sure you want to ${makeAdmin ? "grant" : "revoke"} admin access?`)) {
      return;
    }
    try {
      await toggleUserAdmin(userId, makeAdmin);
      fetchUsers();
    } catch (error) {
      console.error("Failed to toggle admin:", error);
      alert("Failed to update user. Please try again.");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteUser(userId);
      fetchUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user. Please try again.");
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail) {
      alert("Email is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser({
        email: newUserEmail,
        firstName: newUserFirstName || undefined,
        lastName: newUserLastName || undefined,
        isAdmin: makeAdmin,
        skipPasswordRequirement: true,
      });
      
      // Reset form
      setNewUserEmail("");
      setNewUserFirstName("");
      setNewUserLastName("");
      setMakeAdmin(false);
      setIsAddDialogOpen(false);
      
      // Refresh user list
      fetchUsers();
      
      alert("User created successfully. They will receive an email to set their password.");
    } catch (error) {
      console.error("Failed to create user:", error);
      alert(error instanceof Error ? error.message : "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteUser = async () => {
    if (!newUserEmail) {
      alert("Email is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await inviteUser({
        email: newUserEmail,
        firstName: newUserFirstName || undefined,
        lastName: newUserLastName || undefined,
        isAdmin: makeAdmin,
      });
      
      // Reset form
      setNewUserEmail("");
      setNewUserFirstName("");
      setNewUserLastName("");
      setMakeAdmin(false);
      setIsInviteDialogOpen(false);
      
      alert("Invitation sent successfully.");
    } catch (error) {
      console.error("Failed to invite user:", error);
      alert(error instanceof Error ? error.message : "Failed to invite user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewUserEmail("");
    setNewUserFirstName("");
    setNewUserLastName("");
    setMakeAdmin(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Users</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage platform users, view details, and control access.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isInviteDialogOpen} onOpenChange={(open) => {
            setIsInviteDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-700">
                <Mail className="mr-2 h-4 w-4" />
                Invite
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
              <DialogHeader>
                <DialogTitle>Invite User</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Send an email invitation to join the platform.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-firstname">First Name</Label>
                    <Input
                      id="invite-firstname"
                      placeholder="John"
                      value={newUserFirstName}
                      onChange={(e) => setNewUserFirstName(e.target.value)}
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-lastname">Last Name</Label>
                    <Input
                      id="invite-lastname"
                      placeholder="Doe"
                      value={newUserLastName}
                      onChange={(e) => setNewUserLastName(e.target.value)}
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="invite-admin"
                    checked={makeAdmin}
                    onCheckedChange={setMakeAdmin}
                  />
                  <Label htmlFor="invite-admin" className="text-slate-300">
                    Make admin (can access this admin console)
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleInviteUser}
                  disabled={isSubmitting || !newUserEmail}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950"
                >
                  {isSubmitting ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950">
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
              <DialogHeader>
                <DialogTitle>Add User</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Create a new user account. They will receive an email to set their password.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="add-email">Email *</Label>
                  <Input
                    id="add-email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-firstname">First Name</Label>
                    <Input
                      id="add-firstname"
                      placeholder="John"
                      value={newUserFirstName}
                      onChange={(e) => setNewUserFirstName(e.target.value)}
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-lastname">Last Name</Label>
                    <Input
                      id="add-lastname"
                      placeholder="Doe"
                      value={newUserLastName}
                      onChange={(e) => setNewUserLastName(e.target.value)}
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="add-admin"
                    checked={makeAdmin}
                    onCheckedChange={setMakeAdmin}
                  />
                  <Label htmlFor="add-admin" className="text-slate-300">
                    Make admin (can access this admin console)
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={isSubmitting || !newUserEmail}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950"
                >
                  {isSubmitting ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-2xl font-semibold text-slate-100">{total}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        <UserSearch onSearch={handleSearch} initialValue={query} />

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400"
            >
              All Users
            </TabsTrigger>
            <TabsTrigger
              value="admins"
              className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400"
            >
              Admins
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <UserTable
              users={users}
              isLoading={isLoading}
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
              onToggleAdmin={handleToggleAdmin}
              onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="admins" className="mt-4">
            <UserTable
              users={users}
              isLoading={isLoading}
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
              onToggleAdmin={handleToggleAdmin}
              onDelete={handleDelete}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
