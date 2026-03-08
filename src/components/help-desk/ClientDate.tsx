"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow, format } from "date-fns";

interface ClientDateProps {
  date: string | Date | null;
  format?: "distance" | "datetime" | "date";
  fallback?: string;
}

export function ClientDate({ 
  date, 
  format: formatType = "distance",
  fallback = "—" 
}: ClientDateProps) {
  const [formatted, setFormatted] = useState<string>(fallback);

  useEffect(() => {
    if (!date) {
      setFormatted(fallback);
      return;
    }
    
    const dateObj = new Date(date);
    
    switch (formatType) {
      case "distance":
        setFormatted(formatDistanceToNow(dateObj, { addSuffix: true }));
        break;
      case "datetime":
        setFormatted(format(dateObj, "MMM d, yyyy 'at' h:mm a"));
        break;
      case "date":
        setFormatted(format(dateObj, "MMM d, yyyy"));
        break;
      default:
        setFormatted(String(date));
    }
  }, [date, formatType, fallback]);

  return <span>{formatted}</span>;
}
