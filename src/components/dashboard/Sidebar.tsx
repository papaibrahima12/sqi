
import { NavLink } from "react-router-dom";
import {Home, Database, MapPin, ListCheck, Bell, Calendar} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const menuItems = [
  {
    title: "Accueil",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Biens",
    url: "/dashboard/biens",
    icon: Database,
  },
  {
    title: "Planning Location",
    url: "/dashboard/locations",
    icon: Calendar,
  },
  {
    title: "Demandes",
    url: "/dashboard/demandes",
    icon: ListCheck,
  },
];

export function DashboardSidebar() {
  // Fetch pending requests count
  const { data: pendingRequestsCount } = useQuery({
    queryKey: ['pending-requests-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('demande')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'en_attente');
      
      if (error) {
        console.error('Error fetching pending requests:', error);
        return 0;
      }

      return count ?? 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4 border-b">
          <img 
            src="/lovable-uploads/7f374343-1968-4b5b-a9ab-9176cc5ea1fa.png" 
            alt="SQI | SOCIÉTÉ QUALITÉ IMMO" 
            className="h-8 w-auto"
          />
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md transition-colors duration-200 ${isActive ? 'bg-sqi-gold text-white' : 'hover:bg-gray-100'}`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                      {item.title === "Demandes" && pendingRequestsCount > 0 && (
                        <div className="relative">
                          <Bell className="w-5 h-5 text-[#ea384c]" />
                          <span className="absolute -top-2 -right-2 bg-[#ea384c] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                            {pendingRequestsCount}
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

