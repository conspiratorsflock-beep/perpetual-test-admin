"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, Search, Copy, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getCannedResponses } from "@/lib/actions/support-tickets";
interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string | null;
  useCount: number;
}

export function CannedResponsesView() {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadResponses();
  }, []);

  const loadResponses = async () => {
    try {
      const data = await getCannedResponses();
      setResponses(data.map(r => ({ ...r, useCount: 0 })));
    } catch (error) {
      console.error("Failed to load canned responses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredResponses = responses.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Canned Responses</h2>
          <p className="text-slate-400 text-sm">
            Pre-written responses for common inquiries
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950">
              <Plus className="h-4 w-4 mr-2" />
              Add Response
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Add Canned Response</DialogTitle>
            </DialogHeader>
            <p className="text-slate-400">Coming soon...</p>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search responses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-slate-100"
        />
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/50">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-transparent">
              <TableHead className="text-slate-400">Title</TableHead>
              <TableHead className="text-slate-400">Category</TableHead>
              <TableHead className="text-slate-400">Content Preview</TableHead>
              <TableHead className="text-slate-400">Uses</TableHead>
              <TableHead className="text-slate-400 w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                  Loading responses...
                </TableCell>
              </TableRow>
            ) : filteredResponses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No canned responses yet</p>
                  <p className="text-sm">Create your first canned response</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredResponses.map((response) => (
                <TableRow key={response.id} className="border-slate-700">
                  <TableCell className="font-medium text-slate-200">
                    {response.title}
                  </TableCell>
                  <TableCell>
                    {response.category ? (
                      <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                        {response.category}
                      </Badge>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-400 truncate max-w-xs block">
                      {response.content.substring(0, 100)}
                      {response.content.length > 100 ? "..." : ""}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {response.useCount}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-100"
                        onClick={() => handleCopy(response.content)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
