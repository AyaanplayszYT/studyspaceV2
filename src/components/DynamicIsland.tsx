import { Home, FileText, CheckSquare, MessageCircle, Trophy, Inbox } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { ChangelogDialog } from './ChangelogDialog';

const items = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Notes', url: '/notes', icon: FileText },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare },
  { title: 'Chat', url: '/chat', icon: MessageCircle },
  { title: 'Leaderboard', url: '/leaderboard', icon: Trophy },
  { title: 'Inbox', url: '/inbox', icon: Inbox },
];

export function DynamicIsland() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-card/80 backdrop-blur-xl border border-border rounded-full shadow-lg px-4 py-2 flex items-center gap-2 transition-all duration-300 hover:shadow-xl">
        <div className="flex items-center gap-1">
          {items.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end
              className="px-3 py-2 rounded-full transition-all duration-300 hover:bg-accent/50"
              activeClassName="bg-accent text-accent-foreground shadow-sm"
            >
              <item.icon className="h-4 w-4" />
            </NavLink>
          ))}
        </div>
        
        <div className="h-6 w-px bg-border mx-1" />
        
        <ChangelogDialog />
      </div>
    </div>
  );
}
