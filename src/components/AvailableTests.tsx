import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { format, isPast } from 'date-fns';

interface Test {
  id: string;
  title: string;
  description: string;
  subject: string;
  total_points: number;
  time_limit: number;
  due_date: string;
  teacher: {
    username: string;
  };
  submission?: {
    id: string;
    score: number;
    submitted_at: string;
  };
}

export default function AvailableTests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTests();
  }, [user]);

  const loadTests = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch published tests
      const { data: testsData, error } = await supabase
        .from('tests')
        .select(`
          *,
          teacher:profiles!tests_teacher_id_fkey(username),
          test_submissions!inner(id, score, submitted_at, student_id)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include submission status
      const transformedTests = await Promise.all(
        testsData?.map(async (test) => {
          // Check if user has submitted
          const { data: submission } = await supabase
            .from('test_submissions')
            .select('id, score, submitted_at')
            .eq('test_id', test.id)
            .eq('student_id', user.id)
            .single();

          return {
            ...test,
            teacher: test.teacher,
            submission: submission || undefined,
          };
        }) || []
      );

      setTests(transformedTests);
    } catch (error: any) {
      console.error('Error loading tests:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading available tests...</p>
        </CardContent>
      </Card>
    );
  }

  if (tests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Available Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tests available at the moment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Tests & Assignments</CardTitle>
        <CardDescription>Complete your assignments and track your progress</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tests.map((test) => {
            const isOverdue = test.due_date && isPast(new Date(test.due_date));
            const hasSubmitted = !!test.submission;

            return (
              <Card key={test.id} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{test.title}</h3>
                        {test.subject && <Badge variant="outline">{test.subject}</Badge>}
                        {hasSubmitted && (
                          <Badge variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Submitted
                          </Badge>
                        )}
                        {isOverdue && !hasSubmitted && (
                          <Badge variant="destructive">Overdue</Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {test.description || 'No description'}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>{test.total_points} points</span>
                        </div>
                        {test.time_limit && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{test.time_limit} minutes</span>
                          </div>
                        )}
                        {test.due_date && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            <span>Due {format(new Date(test.due_date), 'PPP')}</span>
                          </div>
                        )}
                      </div>

                      {test.teacher && (
                        <p className="text-xs text-muted-foreground">
                          Teacher: {test.teacher.username}
                        </p>
                      )}

                      {hasSubmitted && test.submission && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium">
                            Your Score: {test.submission.score} / {test.total_points} (
                            {((test.submission.score / test.total_points) * 100).toFixed(1)}%)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Submitted {format(new Date(test.submission.submitted_at), 'PPP p')}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      {hasSubmitted ? (
                        <Button variant="outline" disabled>
                          Completed
                        </Button>
                      ) : (
                        <Button
                          onClick={() => navigate(`/tests/take/${test.id}`)}
                          variant={isOverdue ? 'secondary' : 'default'}
                        >
                          Start Test
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
