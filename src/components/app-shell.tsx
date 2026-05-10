import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { RightRail } from "@/components/right-rail";

export function AppShell() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex">
        <div className="flex flex-1 flex-col overflow-hidden">
          <Outlet />
        </div>
        <RightRail />
      </SidebarInset>
    </SidebarProvider>
  );
}
