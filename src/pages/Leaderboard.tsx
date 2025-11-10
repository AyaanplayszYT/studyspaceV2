import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  username: string;
  points: number;
  streak: number;
}

const Leaderboard = () => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, points, streak')
      .order('points', { ascending: false })
      .limit(10);

    if (!error && data) {
      setLeaders(data);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-accent" />;
    if (index === 1) return <Medal className="h-6 w-6 text-secondary" />;
    if (index === 2) return <Award className="h-6 w-6 text-primary" />;
    return <span className="text-xl font-bold text-muted-foreground">#{index + 1}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">Top students by points</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Top 10 Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaders.map((leader, index) => (
              <div
                key={leader.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-card hover:bg-muted transition-smooth border border-border"
              >
                <div className="w-12 flex justify-center">{getRankIcon(index)}</div>
                <div className="flex-1">
                  <h3 className="font-semibold">{leader.username}</h3>
                  <p className="text-sm text-muted-foreground">
                    {leader.streak} day streak
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-accent">{leader.points}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            ))}
          </div>

          {leaders.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No entries yet. Start earning points!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaderboard;
