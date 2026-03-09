import { Metadata } from "next";
import { getSupportTeam } from "@/lib/actions/support-tickets";
import { ScheduleCalendar } from "@/components/help-desk/team/ScheduleCalendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  CalendarDays,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Team | Help Desk",
};

export default async function TeamPage() {
  const team = await getSupportTeam();

  // Calculate team stats
  const stats = {
    total: team.length,
    online: team.filter((m) => m.isAvailable).length,
    admin: team.filter((m) => m.role === "admin").length,
    agent: team.filter((m) => m.role === "agent").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Team</h1>
          <p className="text-slate-400">Agent management, schedules, and skills</p>
        </div>
        <Button>Add Team Member</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-400" />
              <div className="text-2xl font-bold text-slate-100">
                {stats.total}
              </div>
            </div>
            <div className="text-sm text-slate-400">Total Members</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="text-2xl font-bold text-green-400">
                {stats.online}
              </div>
            </div>
            <div className="text-sm text-slate-400">Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-amber-400" />
              <div className="text-2xl font-bold text-amber-400">
                {stats.admin}
              </div>
            </div>
            <div className="text-sm text-slate-400">Admins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              <div className="text-2xl font-bold text-blue-400">
                {stats.agent}
              </div>
            </div>
            <div className="text-sm text-slate-400">Agents</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="agents">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger
            value="agents"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
          >
            <Users className="h-4 w-4 mr-2" />
            Agents
          </TabsTrigger>
          <TabsTrigger
            value="schedules"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Schedules
          </TabsTrigger>
          <TabsTrigger
            value="skills"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
          >
            <Settings className="h-4 w-4 mr-2" />
            Skills & Routing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-800">
                {team.map((member) => (
                  <div
                    key={member.id}
                    className="py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-slate-700 text-slate-300">
                          {member.name?.charAt(0) || member.email.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-slate-100">
                          {member.name || member.email}
                        </div>
                        <div className="text-sm text-slate-400">
                          {member.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex gap-1">
                        {member.skills?.map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>

                      <Badge
                        variant={member.isAvailable ? "default" : "secondary"}
                        className={
                          member.isAvailable
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-slate-700 text-slate-400"
                        }
                      >
                        {member.isAvailable ? "Available" : "Away"}
                      </Badge>

                      <Badge variant="outline" className="capitalize">
                        {member.role}
                      </Badge>

                      <div className="text-sm text-slate-400 min-w-[100px]">
                        Max: {member.maxOpenTickets} tickets
                      </div>

                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="mt-6 space-y-6">
          {team.slice(0, 3).map((member) => (
            <ScheduleCalendar
              key={member.id}
              agentId={member.id}
              agentName={member.name || member.email}
            />
          ))}
        </TabsContent>

        <TabsContent value="skills" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Skills & Routing Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-slate-400 text-center py-8">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Skill-based routing configuration coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
