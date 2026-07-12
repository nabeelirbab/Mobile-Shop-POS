import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Clock, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useGetSettings } from "@workspace/api-client-react";

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { data: settings } = useGetSettings();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-16 border-b border-border bg-background flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">{settings?.store_name || "Store Name"}</h2>
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1 rounded-md">
          <Clock className="w-4 h-4" />
          {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden md:flex gap-2">
          <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            F9 <span className="ml-1">POS</span>
          </kbd>
          <kbd className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            F2 <span className="ml-1">Search</span>
          </kbd>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  );
}
