import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  isLoading?: boolean;
  className?: string;
  delay?: number;
}

export function StatCard({ 
  title, 
  value, 
  icon, 
  subtitle, 
  trend, 
  isLoading, 
  className,
  delay = 0 
}: StatCardProps) {
  return (
    <div 
      className={cn(
        "glass-card p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 animate-in",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Decorative gradient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-9 w-24 bg-secondary animate-pulse rounded-md mt-1" />
            ) : (
              <h3 className="text-3xl font-bold text-foreground tracking-tight">
                {value}
              </h3>
            )}
          </div>
          {subtitle && !isLoading && (
            <p className={cn(
              "text-xs font-medium mt-2 flex items-center gap-1",
              trend === "up" ? "text-green-400" : trend === "down" ? "text-destructive" : "text-muted-foreground"
            )}>
              {subtitle}
            </p>
          )}
        </div>
        
        <div className="h-12 w-12 rounded-xl bg-secondary/80 flex items-center justify-center text-primary border border-white/5 shadow-inner">
          {icon}
        </div>
      </div>
    </div>
  );
}
