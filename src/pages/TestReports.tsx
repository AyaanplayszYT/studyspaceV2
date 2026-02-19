import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Download,
  User,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  FileText,
  Edit,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

interface Test {
  id: string;
  title: string;
  subject: string;
  total_points: number;
}

interface Submission {
  id: string;
  student_id: string;
  submitted_at: string;
  score: number;
  total_points: number;
  time_taken: number;
  is_graded: boolean;
  profiles: {
    username: string;
    email: string;
  };
}

interface Answer {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  points_earned: number;
  teacher_feedback: string;
  test_questions: {
    question_text: string;
    question_type: string;
    points: number;
    correct_answer: string;
    explanation: string;
  };
}

export default function TestReports() {
  const { testId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [test, setTest] = useState<Test | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    loadReports();
  }, [testId]);

  const loadReports = async () => {
    if (!testId) return;

    setLoading(true);
    try {
      // Load test
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;
      setTest(testData);

      // Load submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('test_submissions')
        .select(
          `
          *,
          profiles (username, email)
        `
        )
        .eq('test_id', testId)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;
      setSubmissions(submissionsData || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissionDetails = async (submissionId: string) => {
    try {
      const { data, error } = await supabase
        .from('test_answers')
        .select(
          `
          *,
          test_questions (
            question_text,
            question_type,
            points,
            correct_answer,
            explanation
          )
        `
        )
        .eq('submission_id', submissionId)
        .order('created_at');

      if (error) throw error;
      setAnswers(data || []);
      setSelectedSubmission(submissionId);
      setDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load submission details',
        variant: 'destructive',
      });
    }
  };

  const updateAnswerGrade = async (answerId: string, pointsEarned: number, feedback: string) => {
    setGrading(true);
    try {
      const { error } = await supabase
        .from('test_answers')
        .update({
          points_earned: pointsEarned,
          teacher_feedback: feedback,
        })
        .eq('id', answerId);

      if (error) throw error;

      // Reload answers to update display
      if (selectedSubmission) {
        await loadSubmissionDetails(selectedSubmission);
      }

      toast({
        title: 'Success',
        description: 'Grade updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update grade',
        variant: 'destructive',
      });
    } finally {
      setGrading(false);
    }
  };

  const getStats = () => {
    if (submissions.length === 0) return { avg: 0, high: 0, low: 0, passRate: 0 };

    const scores = submissions.map((s) => (s.score / s.total_points) * 100);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const high = Math.max(...scores);
    const low = Math.min(...scores);
    const passRate = (scores.filter((s) => s >= 60).length / scores.length) * 100;

    return { avg, high, low, passRate };
  };

  const exportToCSV = () => {
    if (submissions.length === 0) return;

    const headers = ['Student Name', 'Email', 'Score', 'Percentage', 'Submitted At', 'Time Taken (min)'];
    const rows = submissions.map((s) => [
      s.profiles.username,
      s.profiles.email,
      `${s.score}/${s.total_points}`,
      `${((s.score / s.total_points) * 100).toFixed(1)}%`,
      format(new Date(s.submitted_at), 'PPP p'),
      Math.floor(s.time_taken / 60),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${test?.title || 'test'}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Results exported to CSV',
    });
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading reports...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!test) return null;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tests')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{test.title} - Reports</h1>
            <p className="text-muted-foreground mt-1">
              View and grade student submissions
            </p>
          </div>
        </div>
        <Button onClick={exportToCSV} variant="outline" disabled={submissions.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
                <p className="text-3xl font-bold">{submissions.length}</p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-3xl font-bold">{stats.avg.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Highest Score</p>
                <p className="text-3xl font-bold">{stats.high.toFixed(1)}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-3xl font-bold">{stats.passRate.toFixed(0)}%</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4" />
              <p>No submissions yet</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Time Taken</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => {
                    const percentage = (submission.score / submission.total_points) * 100;
                    return (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">
                          {submission.profiles.username}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {submission.profiles.email}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            {submission.score} / {submission.total_points}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              percentage >= 90
                                ? 'default'
                                : percentage >= 70
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {percentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.floor(submission.time_taken / 60)} min
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(submission.submitted_at), 'PPp')}
                        </TableCell>
                        <TableCell>
                          {submission.is_graded ? (
                            <Badge variant="outline">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Graded
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Auto-graded
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadSubmissionDetails(submission.id)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submission Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              Review student answers and provide feedback
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {answers.map((answer, index) => (
              <Card key={answer.id}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Question {index + 1}</Badge>
                        <Badge variant={answer.is_correct ? 'default' : 'destructive'}>
                          {answer.is_correct ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {answer.points_earned || 0} / {answer.test_questions.points} pts
                        </Badge>
                      </div>
                      <p className="font-medium">{answer.test_questions.question_text}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Student Answer</Label>
                        <p className="text-sm font-medium">{answer.answer_text || 'No answer'}</p>
                      </div>
                      {answer.test_questions.correct_answer && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Correct Answer</Label>
                          <p className="text-sm font-medium text-green-600">
                            {answer.test_questions.correct_answer}
                          </p>
                        </div>
                      )}
                    </div>

                    {answer.test_questions.explanation && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Explanation</Label>
                        <p className="text-sm">{answer.test_questions.explanation}</p>
                      </div>
                    )}

                    {['short_answer', 'essay'].includes(answer.test_questions.question_type) && (
                      <div className="pt-2 space-y-2 border-t">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor={`points-${answer.id}`}>Points Awarded</Label>
                            <Input
                              id={`points-${answer.id}`}
                              type="number"
                              min="0"
                              max={answer.test_questions.points}
                              defaultValue={answer.points_earned || 0}
                              onBlur={(e) => {
                                const newPoints = parseFloat(e.target.value) || 0;
                                if (newPoints !== answer.points_earned) {
                                  updateAnswerGrade(
                                    answer.id,
                                    newPoints,
                                    answer.teacher_feedback
                                  );
                                }
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`feedback-${answer.id}`}>Teacher Feedback</Label>
                          <Textarea
                            id={`feedback-${answer.id}`}
                            defaultValue={answer.teacher_feedback || ''}
                            onBlur={(e) => {
                              if (e.target.value !== answer.teacher_feedback) {
                                updateAnswerGrade(
                                  answer.id,
                                  answer.points_earned,
                                  e.target.value
                                );
                              }
                            }}
                            placeholder="Add feedback for the student..."
                            rows={3}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
