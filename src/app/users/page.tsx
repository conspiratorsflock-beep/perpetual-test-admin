"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserTable } from "@/components/users/UserTable";
import { UserSearch } from "@/components/users/UserSearch";
import { searchUsers, toggleUserAdmin, deleteUser } from "@/lib/actions/users";
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
        <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950">
          <Plus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
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
              Admins Only
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <UserTable
              users={users}
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              isLoading={isLoading}
              onPageChange={setPage}
              onToggleAdmin={handleToggleAdmin}
              onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="admins" className="mt-4">
            <UserTable
              users={users}
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              isLoading={isLoading}
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
