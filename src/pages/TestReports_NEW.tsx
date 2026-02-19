import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Submission {
  id: string;
  student_id: string;
  score: number;
  submitted_at: string;
  profiles: {
    username: string;
    email: string;
  };
}

export default function TestReports() {
  const { testId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [test, setTest] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (testId && user) loadData();
  }, [testId, user]);

  const loadData = async () => {
    try {
      const [testRes, submissionsRes] = await Promise.all([
        supabase.from('tests').select('*').eq('id', testId).single(),
        supabase
          .from('test_submissions')
          .select('id, student_id, score, submitted_at')
          .eq('test_id', testId)
          .order('submitted_at', { ascending: false }),
      ]);

      setTest(testRes.data);
      
      // Get student profiles separately
      if (submissionsRes.data && submissionsRes.data.length > 0) {
        const studentIds = submissionsRes.data.map((s) => s.student_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', studentIds);

        const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);
        
        setSubmissions(
          submissionsRes.data.map((s) => ({
            ...s,
            profiles: profilesMap.get(s.student_id) || { username: 'Unknown', email: 'N/A' },
          }))
        );
      } else {
        setSubmissions([]);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (submissions.length === 0) {
      toast({ title: 'No Data', description: 'No submissions to export' });
      return;
    }

    const headers = ['Student Name', 'Email', 'Score', 'Submitted At'];
    const rows = submissions.map((s) => [
      (s.profiles as any)?.username || 'N/A',
      (s.profiles as any)?.email || 'N/A',
      s.score,
      format(new Date(s.submitted_at), 'PPpp'),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${test?.title || 'test'}-reports.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8 text-center">Loading reports...</div>;

  const avgScore = submissions.length > 0 ? submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tests')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Test Reports</h1>
            <p className="text-muted-foreground">{test?.title}</p>
          </div>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{submissions.length}</div>
            <div className="text-sm text-muted-foreground">Total Submissions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{avgScore.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">Average Score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {submissions.filter((s) => s.score >= (test?.total_points || 0) * 0.6).length}
            </div>
            <div className="text-sm text-muted-foreground">Pass Rate (60%+)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{test?.total_points || 0}</div>
            <div className="text-sm text-muted-foreground">Total Points</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No submissions yet</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{(sub.profiles as any)?.username || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{(sub.profiles as any)?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(sub.submitted_at), 'PPp')}
                      </p>
                    </div>
                    <Badge variant={sub.score >= (test?.total_points || 0) * 0.6 ? 'default' : 'destructive'}>
                      {sub.score} / {test?.total_points || 0}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
