import { Bot, Activity } from "lucide-react";
import { useBotStatus } from "@/hooks/use-bot-dashboard";

export function TopNav() {
  const { data: status } = useBotStatus();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/50 shadow-lg shadow-primary/20">
            <Bot className="h-6 w-6 text-white" />
            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-background">
              <div className={`h-2.5 w-2.5 rounded-full ${status?.online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-destructive'} transition-colors duration-500`} />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none text-gradient">Roleplay Bot</h1>
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Activity className="h-3 w-3" /> Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-1.5 rounded-full bg-secondary/50 border border-white/5 text-sm font-medium flex items-center gap-2">
            System: <span className={status?.online ? "text-green-400" : "text-destructive"}>
              {status?.online ? "Operational" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
