import { NavLink, useLocation } from "react-router-dom";
import { Calendar, ClipboardList, Users, FileText, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { StatsOverview } from "@/components/stats-overview";

const NAV = [
  { to: "/calendar", label: "日历视图", icon: Calendar },
  { to: "/messages", label: "消息列表", icon: ClipboardList },
  { to: "/groups", label: "群组管理", icon: Users },
  { to: "/templates", label: "模板管理", icon: FileText },
  { to: "/settings", label: "设置", icon: Settings },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-3">
          <div className="text-base font-semibold">企业微信定时消息</div>
          <div className="text-xs text-muted-foreground">Webhook 定时发送</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton isActive={active} render={<NavLink to={item.to} />}>
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>本月概览</SidebarGroupLabel>
          <SidebarGroupContent>
            <StatsOverview />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-2 text-xs text-muted-foreground">
          <div>本地应用 v0.1.0</div>
          <a
            className="text-primary hover:underline"
            href="https://github.com/billyct/calendar-message"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
