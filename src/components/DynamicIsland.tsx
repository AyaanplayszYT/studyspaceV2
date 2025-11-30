import { useState, useEffect } from 'react';
import { Home, FileText, CheckSquare, MessageCircle, Trophy, Inbox, Clock, Zap, PenTool } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { ChangelogDialog } from './ChangelogDialog';

const items = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Notes', url: '/notes', icon: FileText },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare },
  { title: 'Whiteboard', url: '/whiteboard', icon: PenTool },
  { title: 'Chat', url: '/chat', icon: MessageCircle },
  { title: 'Leaderboard', url: '/leaderboard', icon: Trophy },
  { title: 'Inbox', url: '/inbox', icon: Inbox },
];

export function DynamicIsland() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationCount, setNotificationCount] = useState(0);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Simulate notifications (you can replace this with actual notification logic)
  useEffect(() => {
    // Mock notification count - replace with real data
    const mockCount = Math.floor(Math.random() * 5);
    setNotificationCount(mockCount);
  }, [location.pathname]);

  const isActive = (path: string) => currentPath === path;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const currentItem = items.find(item => item.url === currentPath) || items[0];

  return (
    <div 
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in px-4 max-w-full"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className={`
        bg-gradient-to-r from-card/95 via-card/90 to-card/95 
        backdrop-blur-2xl border border-border/50 rounded-full 
        md:shadow-2xl shadow-lg transition-all duration-500 ease-out
        max-w-full overflow-hidden
        ${isExpanded 
          ? 'px-3 md:px-6 py-2 md:py-3 md:shadow-primary/20' 
          : 'px-3 md:px-4 py-2 md:hover:shadow-xl'
        }
      `}>
        <div className="flex items-center gap-2 md:gap-3">
          {/* Compact Mode - Show Current Page Icon + Notification Dot */}
          {!isExpanded && (
            <>
              <div className="relative flex items-center gap-2 md:gap-3">
                <div className="relative">
                  <div className="p-1.5 md:p-2 rounded-full bg-primary/10 text-primary">
                    <currentItem.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </div>
                  {notificationCount > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 w-3.5 h-3.5 md:w-4 md:h-4 bg-red-500 rounded-full flex items-center justify-center md:animate-pulse">
                      <span className="text-[7px] md:text-[8px] text-white font-bold">{notificationCount}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-muted-foreground">
                  <Clock className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  <span className="font-medium">{formatTime(currentTime)}</span>
                </div>
              </div>
              
              <div className="h-5 md:h-6 w-px bg-border/50" />
              
              <ChangelogDialog />
            </>
          )}

          {/* Expanded Mode - Show All Navigation */}
          {isExpanded && (
            <>
              <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide max-w-full">
                {/* Time and Greeting */}
                <div className="hidden sm:flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-primary/10 text-primary animate-in fade-in slide-in-from-left-2 duration-300 flex-shrink-0">
                  <Clock className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  <div className="flex flex-col">
                    <span className="text-[9px] md:text-[10px] font-medium opacity-80">{getGreeting()}</span>
                    <span className="text-[10px] md:text-xs font-bold">{formatTime(currentTime)}</span>
                  </div>
                </div>

                {/* Navigation Items */}
                <div className="flex items-center gap-0.5 md:gap-1 animate-in fade-in slide-in-from-left-4 duration-500 flex-shrink-0">
                  {items.map((item, index) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      end
                      className="group relative px-2 md:px-3 py-1.5 md:py-2 rounded-full transition-all duration-300 md:hover:bg-accent/80 md:hover:scale-110"
                      activeClassName="bg-gradient-to-r from-primary/20 to-primary/10 text-primary shadow-sm md:scale-105"
                      style={{
                        animationDelay: `${index * 50}ms`
                      }}
                    >
                      <item.icon className="h-3.5 w-3.5 md:h-4 md:w-4 transition-transform md:group-hover:scale-110" />
                      
                      {/* Tooltip - Hidden on mobile */}
                      <div className="hidden md:block absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-lg border">
                        {item.title}
                      </div>
                      
                      {/* Active Indicator Pulse - Desktop only */}
                      {isActive(item.url) && (
                        <div className="hidden md:block absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                      )}
                    </NavLink>
                  ))}
                </div>
                
                <div className="h-5 md:h-6 w-px bg-border/50 mx-0.5 md:mx-1 animate-in fade-in duration-700 flex-shrink-0" />
                
                {/* Notification Badge */}
                {notificationCount > 0 && (
                  <div className="flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-full bg-red-500/10 text-red-500 animate-in fade-in slide-in-from-right-2 duration-300 flex-shrink-0">
                    <Zap className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    <span className="text-[10px] md:text-xs font-bold">{notificationCount}</span>
                  </div>
                )}
                
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex-shrink-0">
                  <ChangelogDialog />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Active Page Indicator Bar - Desktop only */}
        <div className={`
          hidden md:block absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent 
          transition-all duration-500 ease-out
          ${isExpanded ? 'w-full opacity-100' : 'w-0 opacity-0'}
        `} />
      </div>

      {/* Glow Effect - Desktop only */}
      <div className={`
        hidden md:block absolute inset-0 rounded-full bg-primary/5 blur-xl -z-10
        transition-all duration-500
        ${isExpanded ? 'opacity-100 scale-110' : 'opacity-0 scale-100'}
      `} />
    </div>
  );
}
