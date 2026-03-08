"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
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

export function UsersContent() {
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
  const [isPending, startTransition] = useTransition();

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
      const result = await searchUsers({
        query: query || undefined,
        isAdmin: activeTab === "admins" ? true : undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setUsers(result.users);
      setTotal(result.total);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [query, activeTab, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    setPage(1);
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (newQuery) {
        params.set("q", newQuery);
      } else {
        params.delete("q");
      }
      router.push(`/users?${params.toString()}`);
    });
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value !== "all") {
        params.set("tab", value);
      } else {
        params.delete("tab");
      }
      router.push(`/users?${params.toString()}`);
    });
  };

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      await toggleUserAdmin(userId, !isAdmin);
      await fetchUsers();
    } catch (error) {
      console.error("Failed to toggle admin:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(userId);
      await fetchUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createUser({
        email: newUserEmail,
        firstName: newUserFirstName,
        lastName: newUserLastName,
        isAdmin: makeAdmin,
      });
      setIsAddDialogOpen(false);
      setNewUserEmail("");
      setNewUserFirstName("");
      setNewUserLastName("");
      setMakeAdmin(false);
      await fetchUsers();
    } catch (error) {
      console.error("Failed to create user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await inviteUser({ email: newUserEmail });
      setIsInviteDialogOpen(false);
      setNewUserEmail("");
      await fetchUsers();
    } catch (error) {
      console.error("Failed to invite user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Users</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage users, view details, and control admin access.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
              >
                <Mail className="mr-2 h-4 w-4" />
                Invite
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-slate-100">Invite User</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Send an invitation email to a new user.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInviteUser}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email" className="text-slate-300">
                      Email
                    </Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="bg-slate-950 border-slate-800 text-slate-100"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950"
                  >
                    {isSubmitting ? "Sending..." : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950">
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-slate-100">Add User</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Create a new user account.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="bg-slate-950 border-slate-800 text-slate-100"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-slate-300">
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        value={newUserFirstName}
                        onChange={(e) => setNewUserFirstName(e.target.value)}
                        placeholder="John"
                        className="bg-slate-950 border-slate-800 text-slate-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-slate-300">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        value={newUserLastName}
                        onChange={(e) => setNewUserLastName(e.target.value)}
                        placeholder="Doe"
                        className="bg-slate-950 border-slate-800 text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="admin"
                      checked={makeAdmin}
                      onCheckedChange={setMakeAdmin}
                    />
                    <Label htmlFor="admin" className="text-slate-300">
                      Make admin
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950"
                  >
                    {isSubmitting ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
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

      {/* Search */}
      <UserSearch onSearch={handleSearch} initialValue={query} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-slate-900 border-slate-800">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
          >
            All Users
          </TabsTrigger>
          <TabsTrigger
            value="admins"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
          >
            Admins
          </TabsTrigger>
          <TabsTrigger
            value="recent"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
          >
            Recent
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <UserTable
            users={users}
            isLoading={isLoading}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
            onToggleAdmin={handleToggleAdmin}
            onDelete={handleDeleteUser}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
