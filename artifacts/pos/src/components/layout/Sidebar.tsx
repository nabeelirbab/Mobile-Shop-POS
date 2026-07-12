import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useGetSettings } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  ShoppingCart,
  History,
  Package,
  Tags,
  Users,
  Truck,
  Receipt,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { path: "/pos", label: "POS", icon: ShoppingCart, roles: ["admin", "cashier"] },
  { path: "/sales", label: "Sales History", icon: History, roles: ["admin", "cashier"] },
  { path: "/products", label: "Products", icon: Package, roles: ["admin"] },
  { path: "/categories", label: "Categories", icon: Tags, roles: ["admin"] },
  { path: "/customers", label: "Customers", icon: Users, roles: ["admin", "cashier"] },
  { path: "/suppliers", label: "Suppliers", icon: Truck, roles: ["admin"] },
  { path: "/purchases", label: "Purchases", icon: Receipt, roles: ["admin"] },
  { path: "/expenses", label: "Expenses", icon: Wallet, roles: ["admin"] },
  { path: "/reports", label: "Reports", icon: BarChart3, roles: ["admin"] },
  { path: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: settings } = useGetSettings();

  if (!user) return null;

  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  const logoSrc = (settings as any)?.logo
    ? (settings as any).logo.startsWith("data:") || (settings as any).logo.startsWith("http")
      ? (settings as any).logo
      : (settings as any).logo
    : "/umg-logo.jpg";

  const storeName = settings?.store_name || "Umair Mobile Gallery";

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border h-[100dvh] flex flex-col fixed left-0 top-0 z-20">
      {/* Header with logo */}
      <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex-shrink-0 shadow-sm border border-border">
          <img
            src={logoSrc}
            alt="Logo"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="overflow-hidden">
          <h1 className="font-bold text-sm leading-tight truncate">{storeName}</h1>
          <p className="text-xs text-muted-foreground leading-tight">POS System</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3">
        <nav className="space-y-0.5 px-2">
          {filteredItems.map((item) => {
            const isActive =
              location === item.path ||
              (item.path !== "/" && location.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate leading-tight">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize leading-tight">{user.role}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
          onClick={logout}
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
