import { Home, FileText, CheckSquare, MessageCircle, Trophy, Inbox, LogOut, Users, Video, Clock, PenTool, Settings as SettingsIcon, UserCircle, ClipboardList, Shield } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  { title: 'Pomodoro Timer', url: '/pomodoro', icon: Clock },
  { title: 'Whiteboard', url: '/whiteboard', icon: PenTool },
  { title: 'Notes', url: '/notes', icon: FileText },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare },
  { title: 'Test Catalogue', url: '/tests/catalogue', icon: ClipboardList },
  { title: 'Chat', url: '/chat', icon: MessageCircle },
  { title: 'Direct Messages', url: '/dms', icon: MessageCircle },
  { title: 'Find Users', url: '/users', icon: Users },
  { title: 'Study Rooms', url: '/study-rooms', icon: Video },
  { title: 'Leaderboard', url: '/leaderboard', icon: Trophy },
  { title: 'Inbox', url: '/inbox', icon: Inbox },
];

const profileItems = [
  { title: 'My Profile', url: '/profile/me', icon: UserCircle },
  { title: 'Settings', url: '/settings', icon: SettingsIcon },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const currentPath = location.pathname;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      setIsAdmin(data?.is_admin || false);
    };
    checkAdmin();
  }, [user]);

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

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? 'sr-only' : ''}>Teacher Tools</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/tests"
                      end
                      className="hover:bg-sidebar-accent transition-smooth"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <ClipboardList className="h-4 w-4" />
                      {!collapsed && <span>Tests & Assignments</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin"
                      end
                      className="hover:bg-sidebar-accent transition-smooth"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Admin Panel</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? 'sr-only' : ''}>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {profileItems.map((item) => (
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
