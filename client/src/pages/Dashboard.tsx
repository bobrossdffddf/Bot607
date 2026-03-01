import { useBotStatus, useServers, useBusinesses } from "@/hooks/use-bot-dashboard";
import { TopNav } from "@/components/layout/TopNav";
import { StatCard } from "@/components/dashboard/StatCard";
import { 
  Activity, 
  Server, 
  Building2, 
  Zap, 
  WifiOff, 
  CheckCircle2, 
  XCircle,
  Hash
} from "lucide-react";

export default function Dashboard() {
  const { data: status, isLoading: statusLoading } = useBotStatus();
  const { data: servers, isLoading: serversLoading } = useServers();
  const { data: businesses, isLoading: businessesLoading } = useBusinesses();

  const isOnline = status?.online ?? false;
  
  // Calculate business stats
  const onlineBusinessesCount = businesses?.filter(b => b.isOnline).length || 0;
  const totalBusinessesCount = businesses?.length || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 animate-in">
          <h2 className="text-3xl font-bold text-foreground">Overview</h2>
          <p className="text-muted-foreground mt-1">Real-time telemetry and database status.</p>
        </div>

        {/* Top Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Bot Status" 
            value={isOnline ? "Online" : "Offline"} 
            subtitle={isOnline ? "All systems nominal" : "Connection lost"}
            trend={isOnline ? "up" : "down"}
            icon={isOnline ? <Zap className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
            isLoading={statusLoading}
            delay={100}
            className={isOnline ? "" : "border-destructive/30"}
          />
          <StatCard 
            title="Gateway Ping" 
            value={status?.ping ? `${status.ping}ms` : "--"} 
            subtitle="WebSocket latency"
            icon={<Activity className="h-6 w-6" />}
            isLoading={statusLoading}
            delay={200}
          />
          <StatCard 
            title="Connected Guilds" 
            value={status?.guildsCount || servers?.length || 0} 
            subtitle="Active server configurations"
            icon={<Server className="h-6 w-6" />}
            isLoading={statusLoading || serversLoading}
            delay={300}
          />
          <StatCard 
            title="Active Businesses" 
            value={`${onlineBusinessesCount} / ${totalBusinessesCount}`}
            subtitle="Currently clocked in"
            icon={<Building2 className="h-6 w-6" />}
            isLoading={businessesLoading}
            delay={400}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Servers Table */}
          <div className="glass-card rounded-2xl border border-white/5 overflow-hidden flex flex-col animate-in" style={{ animationDelay: '500ms' }}>
            <div className="p-6 border-b border-white/5 bg-secondary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Registered Servers</h3>
                  <p className="text-sm text-muted-foreground">Configured channels per guild</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-secondary/10 uppercase border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Guild ID</th>
                    <th className="px-6 py-4 font-semibold">Properties Ch.</th>
                    <th className="px-6 py-4 font-semibold">Businesses Ch.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {serversLoading ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-muted-foreground"><div className="animate-pulse">Loading configurations...</div></td></tr>
                  ) : servers?.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">No servers configured. Run /setup in Discord.</td></tr>
                  ) : (
                    servers?.map((server) => (
                      <tr key={server.guildId} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4 font-mono text-xs text-foreground group-hover:text-primary transition-colors">
                          {server.guildId}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Hash className="h-3 w-3" />
                            {server.propertiesChannelId}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Hash className="h-3 w-3" />
                            {server.businessesChannelId}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Businesses Table */}
          <div className="glass-card rounded-2xl border border-white/5 overflow-hidden flex flex-col animate-in" style={{ animationDelay: '600ms' }}>
            <div className="p-6 border-b border-white/5 bg-secondary/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Business Roster</h3>
                  <p className="text-sm text-muted-foreground">Status of all registered businesses</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-secondary/10 uppercase border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Business Name</th>
                    <th className="px-6 py-4 font-semibold">Employee</th>
                    <th className="px-6 py-4 font-semibold text-right">Role ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {businessesLoading ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground"><div className="animate-pulse">Loading roster...</div></td></tr>
                  ) : businesses?.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No businesses created yet.</td></tr>
                  ) : (
                    businesses?.map((business) => (
                      <tr key={business.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          {business.isOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
                              <CheckCircle2 className="h-3 w-3" /> Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-500/10 text-zinc-400 text-xs font-medium border border-zinc-500/20">
                              <XCircle className="h-3 w-3" /> Offline
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground">
                          {business.name}
                        </td>
                        <td className="px-6 py-4">
                          {business.isOnline && business.employeeId ? (
                            <span className="text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">@{business.employeeId}</span>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs italic">none</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs text-muted-foreground">
                          {business.roleId}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
