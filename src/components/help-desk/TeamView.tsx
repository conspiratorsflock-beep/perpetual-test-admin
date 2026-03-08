"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus, Mail, Shield, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSupportTeam } from "@/lib/actions/support-tickets";

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: string;
  isAvailable: boolean;
  maxOpenTickets: number;
  skills: string[];
}

export function TeamView() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      const data = await getSupportTeam();
      setTeam(data);
    } catch (error) {
      console.error("Failed to load team:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const roleColors: Record<string, string> = {
    admin: "bg-purple-500/20 text-purple-400",
    agent: "bg-blue-500/20 text-blue-400",
    viewer: "bg-slate-500/20 text-slate-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Support Team</h2>
          <p className="text-slate-400 text-sm">Manage team members and their availability</p>
        </div>
        <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/50">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-transparent">
              <TableHead className="text-slate-400">Member</TableHead>
              <TableHead className="text-slate-400">Role</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Max Tickets</TableHead>
              <TableHead className="text-slate-400">Skills</TableHead>
              <TableHead className="text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                  Loading team...
                </TableCell>
              </TableRow>
            ) : team.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No team members yet</p>
                  <p className="text-sm">Add your first support team member</p>
                </TableCell>
              </TableRow>
            ) : (
              team.map((member) => (
                <TableRow key={member.id} className="border-slate-700">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-slate-700 text-slate-300">
                          {member.name?.[0] || member.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-slate-200">
                          {member.name || "Unknown"}
                        </div>
                        <div className="text-sm text-slate-400">{member.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[member.role] || roleColors.viewer}>
                      <Shield className="h-3 w-3 mr-1" />
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.isAvailable ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/30">
                        <XCircle className="h-3 w-3 mr-1" />
                        Away
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {member.maxOpenTickets}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.skills?.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="bg-slate-700 text-slate-300 text-xs"
                        >
                          {skill}
                        </Badge>
                      )) || <span className="text-slate-500">-</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-slate-400">
                      <Mail className="h-4 w-4" />
                    </Button>
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
