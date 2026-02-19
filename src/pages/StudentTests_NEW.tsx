import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, FileText, Clock, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Test {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  total_points: number;
  time_limit: number | null;
  due_date: string | null;
  is_published: boolean;
}

export default function StudentTests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadTests();
  }, [user]);

  const loadTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.subject && t.subject.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test Catalogue</h1>
        <p className="text-muted-foreground">Browse and take available tests</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">{tests.length}</div>
          <div className="text-sm text-muted-foreground">Available Tests</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">
            {tests.filter(t => t.due_date && new Date(t.due_date) > new Date()).length}
          </div>
          <div className="text-sm text-muted-foreground">Upcoming</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">
            {tests.filter(t => t.due_date && new Date(t.due_date) < new Date()).length}
          </div>
          <div className="text-sm text-muted-foreground">Past Due</div>
        </CardContent></Card>
      </div>

      {filteredTests.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tests found</h3>
          <p className="text-muted-foreground">Check back later for new tests</p>
        </CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredTests.map((test) => (
            <Card key={test.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{test.title}</h3>
                      {test.subject && <Badge variant="outline">{test.subject}</Badge>}
                    </div>
                    {test.description && <p className="text-sm text-muted-foreground">{test.description}</p>}
                  </div>

                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      <span>{test.total_points} pts</span>
                    </div>
                    {test.time_limit && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{test.time_limit} min</span>
                      </div>
                    )}
                  </div>

                  {test.due_date && (
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(test.due_date), 'PPp')}
                    </p>
                  )}

                  <Button className="w-full" onClick={() => navigate(`/tests/take/${test.id}`)}>
                    Start Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
