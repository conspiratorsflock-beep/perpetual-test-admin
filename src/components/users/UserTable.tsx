"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowUpDown, ChevronLeft, ChevronRight, MoreHorizontal, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminUser } from "@/types/admin";

interface UserTableProps {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onToggleAdmin?: (userId: string, makeAdmin: boolean) => void;
  onDelete?: (userId: string) => void;
}

export function UserTable({
  users,
  total,
  page,
  pageSize,
  isLoading = false,
  onPageChange,
  onToggleAdmin,
  onDelete,
}: UserTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);

  const columns = [
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }: { row: { original: AdminUser } }) => {
        const user = row.original;
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed";
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.imageUrl} alt={name} />
              <AvatarFallback className="bg-slate-800 text-slate-400 text-xs">
                {name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Link
                href={`/users/${user.id}`}
                className="font-medium text-slate-100 hover:text-amber-400 transition-colors"
              >
                {name}
              </Link>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "isAdmin",
      header: "Role",
      cell: ({ row }: { row: { original: AdminUser } }) => {
        const user = row.original;
        return user.isAdmin ? (
          <Badge variant="default" className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        ) : (
          <Badge variant="outline" className="border-slate-700 text-slate-400">
            User
          </Badge>
        );
      },
    },
    {
      accessorKey: "organizationName",
      header: "Organization",
      cell: ({ row }: { row: { original: AdminUser } }) => {
        const org = row.original.organizationName;
        return org ? (
          <span className="text-sm text-slate-300">{org}</span>
        ) : (
          <span className="text-sm text-slate-600">—</span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }: { column: { getIsSorted: () => string | boolean; toggleSorting: (desc: boolean) => void } }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(true)}
          className="text-slate-400 hover:text-slate-100"
        >
          Created
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }: { row: { original: AdminUser } }) => {
        return (
          <span className="text-sm text-slate-400">
            {format(new Date(row.original.createdAt), "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      accessorKey: "lastSignInAt",
      header: "Last Sign In",
      cell: ({ row }: { row: { original: AdminUser } }) => {
        const date = row.original.lastSignInAt;
        return date ? (
          <span className="text-sm text-slate-400">
            {format(new Date(date), "MMM d, yyyy")}
          </span>
        ) : (
          <span className="text-sm text-slate-600">Never</span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }: { row: { original: AdminUser } }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
              <DropdownMenuItem asChild>
                <Link href={`/users/${user.id}`} className="text-slate-300 focus:text-slate-100 focus:bg-slate-800">
                  View Details
                </Link>
              </DropdownMenuItem>
              {onToggleAdmin && (
                <DropdownMenuItem
                  onClick={() => onToggleAdmin(user.id, !user.isAdmin)}
                  className="text-slate-300 focus:text-slate-100 focus:bg-slate-800"
                >
                  {user.isAdmin ? "Revoke Admin" : "Make Admin"}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(user.id)}
                  className="text-red-400 focus:text-red-300 focus:bg-slate-800"
                >
                  Delete User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-800">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-slate-800 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-slate-400">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-slate-800 hover:bg-slate-900/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {total === 0
            ? "No users found"
            : `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, total)} of ${total} users`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
