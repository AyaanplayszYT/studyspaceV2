import { Home, FileText, CheckSquare, MessageCircle, Trophy, Inbox, LogOut } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from './ui/button';

const items = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Notes', url: '/notes', icon: FileText },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare },
  { title: 'Chat', url: '/chat', icon: MessageCircle },
  { title: 'Leaderboard', url: '/leaderboard', icon: Trophy },
  { title: 'Inbox', url: '/inbox', icon: Inbox },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const collapsed = state === 'collapsed';

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-60'} collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          <h1 className={`font-bold text-xl ${collapsed ? 'hidden' : 'block'}`}>
            StudySpace<span className="text-accent">V2</span>
          </h1>
          {collapsed && <span className="text-accent font-bold text-xl">S</span>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? 'sr-only' : ''}>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent transition-smooth"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          <Button
            onClick={signOut}
            variant="outline"
            className={`w-full ${collapsed ? 'px-2' : ''}`}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
