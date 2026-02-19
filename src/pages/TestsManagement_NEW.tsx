import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, BarChart, Pencil, Trash2 } from 'lucide-react';
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
  created_at: string;
}

export default function TestsManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadTests();
  }, [user]);

  const loadTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTests(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (testId: string) => {
    if (!confirm('Delete this test?')) return;
    try {
      const { error } = await supabase.from('tests').delete().eq('id', testId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Test deleted' });
      loadTests();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const togglePublish = async (testId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('tests')
        .update({ is_published: !current })
        .eq('id', testId);
      if (error) throw error;
      toast({ title: 'Success', description: !current ? 'Published' : 'Unpublished' });
      loadTests();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tests Management</h1>
          <p className="text-muted-foreground">Create and manage tests</p>
        </div>
        <Button onClick={() => navigate('/tests/create')} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Create Test
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">{tests.length}</div>
          <div className="text-sm text-muted-foreground">Total Tests</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">{tests.filter(t => t.is_published).length}</div>
          <div className="text-sm text-muted-foreground">Published</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">{tests.filter(t => !t.is_published).length}</div>
          <div className="text-sm text-muted-foreground">Drafts</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">
            {tests.filter(t => t.due_date && new Date(t.due_date) < new Date()).length}
          </div>
          <div className="text-sm text-muted-foreground">Past Due</div>
        </CardContent></Card>
      </div>

      {tests.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tests yet</h3>
          <p className="text-muted-foreground mb-4">Create your first test</p>
          <Button onClick={() => navigate('/tests/create')}>
            <Plus className="mr-2 h-4 w-4" />Create Test
          </Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => (
            <Card key={test.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{test.title}</h3>
                      <Badge variant={test.is_published ? 'default' : 'secondary'}>
                        {test.is_published ? 'Published' : 'Draft'}
                      </Badge>
                      {test.subject && <Badge variant="outline">{test.subject}</Badge>}
                    </div>
                    {test.description && <p className="text-muted-foreground mb-3">{test.description}</p>}
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{test.total_points} pts</span>
                      {test.time_limit && <span>{test.time_limit} min</span>}
                      {test.due_date && <span>Due: {format(new Date(test.due_date), 'PPp')}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/tests/reports/${test.id}`)}>
                      <BarChart className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/tests/edit/${test.id}`)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => togglePublish(test.id, test.is_published)}>
                      {test.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(test.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
