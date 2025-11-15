import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useThemeManager } from '@/hooks/use-theme-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Trophy, Target, TrendingUp, LogOut, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const GREETINGS = [
  'Ready to crush your study goals today?',
  'Let\'s make today productive!',
  'Time to level up your skills!',
  'Your progress awaits you!',
  'Let\'s ace those studies!',
  'You\'ve got this! Keep pushing!',
  'Every study session brings you closer to success!',
  'Today is the perfect day to learn something new!',
  'Your dedication is your superpower!',
  'Let\'s turn your goals into achievements!',
  'Another day to make progress!',
  'You\'re one step closer to mastery!',
  'Time to unleash your potential!',
  'Knowledge is power - let\'s get some!',
  'Ready for an amazing study session?',
  'Your future self will thank you!',
  'Let\'s make learning fun today!',
  'Success is built one study session at a time!',
  'You\'re stronger than yesterday. Keep going!',
  'Let\'s create something incredible!',
];

interface ProfileData {
  username: string;
  streak: number;
  points: number;
  rank: number;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { currentTheme } = useThemeManager();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('username, streak, points, rank')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, <span className={`font-bold ${
              currentTheme === 'forest' ? 'text-emerald-500' : 
              currentTheme === 'purple' ? 'text-purple-400' : 
              'text-blue-400'
            }`}>{profile?.username || 'Student'}</span>
          </h1>
          <p className="text-muted-foreground">{greeting}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/settings')} variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={signOut} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card hover:shadow-card-hover transition-smooth border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <Flame className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{profile?.streak || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">days in a row</p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-card-hover transition-smooth border-l-4 border-l-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points</CardTitle>
            <TrendingUp className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{profile?.points || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">total points earned</p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-card-hover transition-smooth border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rank</CardTitle>
            <Trophy className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">#{profile?.rank || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">on the leaderboard</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/notes"
              className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-smooth"
            >
              <h3 className="font-semibold mb-1">Share Notes</h3>
              <p className="text-sm text-muted-foreground">
                Upload and share study materials with classmates
              </p>
            </Link>
            <Link
              to="/tasks"
              className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-smooth"
            >
              <h3 className="font-semibold mb-1">Create Task</h3>
              <p className="text-sm text-muted-foreground">
                Track assignments and deadlines
              </p>
            </Link>
            <Link
              to="/chat"
              className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-smooth"
            >
              <h3 className="font-semibold mb-1">Join Chat</h3>
              <p className="text-sm text-muted-foreground">
                Connect with your study group
              </p>
            </Link>
            <Link
              to="/inbox"
              className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-smooth"
            >
              <h3 className="font-semibold mb-1">Check Inbox</h3>
              <p className="text-sm text-muted-foreground">
                View messages and friend requests
              </p>
            </Link>
            <Link
              to="/admin"
              className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-smooth"
            >
              <h3 className="font-semibold mb-1">Admin Panel</h3>
              <p className="text-sm text-muted-foreground">
                Access admin features and controls
              </p>
            </Link>
            <Link
              to="/ai-chat"
              className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-smooth"
            >
              <h3 className="font-semibold mb-1">AI Chat</h3>
              <p className="text-sm text-muted-foreground">
                Chat with an AI assistant
              </p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
