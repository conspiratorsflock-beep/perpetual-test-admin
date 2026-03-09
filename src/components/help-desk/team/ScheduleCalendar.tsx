"use client";

import { useState } from "react";
import type { AgentSchedule, ScheduleShift } from "@/types/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  CalendarDays,
} from "lucide-react";
import { format, addWeeks, startOfWeek, addDays, isSameDay } from "date-fns";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = [
  "bg-blue-500/20 border-blue-500/30 text-blue-300",
  "bg-green-500/20 border-green-500/30 text-green-300",
  "bg-purple-500/20 border-purple-500/30 text-purple-300",
  "bg-orange-500/20 border-orange-500/30 text-orange-300",
];

interface ScheduleCalendarProps {
  agentId: string;
  agentName: string;
  schedule?: AgentSchedule;
}

export function ScheduleCalendar({
  agentId,
  agentName,
  schedule,
}: ScheduleCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const weekStart = startOfWeek(currentWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getShiftsForDay = (dayIndex: number): ScheduleShift[] => {
    return (
      schedule?.shifts.filter(
        (s) => s.dayOfWeek === dayIndex && s.isActive
      ) || []
    );
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
  };

  const today = new Date();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-slate-400" />
            {agentName}&apos;s Schedule
          </CardTitle>
          <p className="text-sm text-slate-400">
            Timezone: {schedule?.timezone || "Not set"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[150px] text-center">
            {format(weekStart, "MMM d")} -{" "}
            {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!schedule ? (
          <div className="text-center py-8 text-slate-400">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No schedule configured</p>
            <Button variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Create Schedule
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((day, idx) => {
              const shifts = getShiftsForDay(idx);
              const date = weekDays[idx];
              const isToday = isSameDay(date, today);

              return (
                <div
                  key={day}
                  className={`border rounded-lg p-2 min-h-[140px] ${
                    isToday
                      ? "border-amber-500/50 bg-amber-500/5"
                      : "border-slate-700"
                  }`}
                >
                  <div className="text-center mb-2">
                    <div className="text-xs text-slate-500">{day}</div>
                    <div
                      className={`text-sm font-medium ${
                        isToday ? "text-amber-400" : "text-slate-300"
                      }`}
                    >
                      {format(date, "d")}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {shifts.length === 0 ? (
                      <div className="text-xs text-slate-600 text-center py-4">
                        Off
                      </div>
                    ) : (
                      shifts.map((shift, sIdx) => (
                        <div
                          key={shift.id}
                          className={`text-xs p-1.5 rounded border ${
                            COLORS[sIdx % COLORS.length]
                          }`}
                        >
                          <div className="font-medium">
                            {formatTime(shift.startTime)} -{" "}
                            {formatTime(shift.endTime)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
