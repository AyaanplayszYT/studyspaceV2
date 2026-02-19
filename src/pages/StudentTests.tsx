import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Search,
  Filter,
  Calendar,
  Award
} from 'lucide-react';
import { format, isPast, isFuture } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Test {
  id: string;
  title: string;
  description: string;
  subject: string;
  total_points: number;
  time_limit: number;
  due_date: string;
  created_at: string;
  teacher: {
    username: string;
  };
  submission?: {
    id: string;
    score: number;
    submitted_at: string;
    total_points: number;
  };
}

export default function StudentTests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [filteredTests, setFilteredTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'completed' | 'overdue'>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');

  useEffect(() => {
    loadTests();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [tests, searchQuery, filterStatus, filterSubject]);

  const loadTests = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: testsData, error } = await supabase
        .from('tests')
        .select(`
          *,
          teacher:profiles!tests_teacher_id_fkey(username)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load submissions for each test
      const transformedTests = await Promise.all(
        testsData?.map(async (test) => {
          const { data: submission } = await supabase
            .from('test_submissions')
            .select('id, score, submitted_at, total_points')
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

  const applyFilters = () => {
    let filtered = [...tests];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (test) =>
          test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          test.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          test.subject?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((test) => {
        if (filterStatus === 'completed') return !!test.submission;
        if (filterStatus === 'available') return !test.submission;
        if (filterStatus === 'overdue') {
          return test.due_date && isPast(new Date(test.due_date)) && !test.submission;
        }
        return true;
      });
    }

    // Subject filter
    if (filterSubject !== 'all') {
      filtered = filtered.filter((test) => test.subject === filterSubject);
    }

    setFilteredTests(filtered);
  };

  const getSubjects = () => {
    const subjects = new Set(tests.map((test) => test.subject).filter(Boolean));
    return Array.from(subjects);
  };

  const getStats = () => {
    const completed = tests.filter((t) => t.submission).length;
    const available = tests.filter((t) => !t.submission).length;
    const overdue = tests.filter(
      (t) => t.due_date && isPast(new Date(t.due_date)) && !t.submission
    ).length;
    const avgScore = tests
      .filter((t) => t.submission)
      .reduce((sum, t) => {
        if (t.submission) {
          return sum + (t.submission.score / t.submission.total_points) * 100;
        }
        return sum;
      }, 0) / (completed || 1);

    return { completed, available, overdue, avgScore };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading tests...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Test Catalogue</h1>
        <p className="text-muted-foreground mt-1">
          Browse and complete your assignments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-3xl font-bold">{stats.available}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold">{stats.overdue}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-3xl font-bold">{stats.avgScore.toFixed(0)}%</p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tests by title, subject, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tests</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            {getSubjects().length > 0 && (
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {getSubjects().map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tests List */}
      <div className="space-y-4">
        {filteredTests.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No tests found</p>
              <p className="text-muted-foreground">
                {searchQuery || filterStatus !== 'all' || filterSubject !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Check back later for new tests'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTests.map((test) => {
            const isOverdue = test.due_date && isPast(new Date(test.due_date));
            const hasSubmitted = !!test.submission;
            const percentage = test.submission
              ? (test.submission.score / test.submission.total_points) * 100
              : 0;

            return (
              <Card key={test.id} className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-xl">{test.title}</h3>
                        {test.subject && <Badge variant="outline">{test.subject}</Badge>}
                        {hasSubmitted && (
                          <Badge
                            variant={
                              percentage >= 90
                                ? 'default'
                                : percentage >= 70
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {percentage.toFixed(1)}%
                          </Badge>
                        )}
                        {isOverdue && !hasSubmitted && (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>

                      <p className="text-muted-foreground">
                        {test.description || 'No description provided'}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>{test.total_points} points</span>
                        </div>
                        {test.time_limit && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{test.time_limit} minutes</span>
                          </div>
                        )}
                        {test.due_date && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Due {format(new Date(test.due_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}
                      </div>

                      {test.teacher && (
                        <p className="text-xs text-muted-foreground">
                          Teacher: {test.teacher.username}
                        </p>
                      )}

                      {hasSubmitted && test.submission && (
                        <div className="pt-3 border-t">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                Score: {test.submission.score} / {test.submission.total_points}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Submitted on{' '}
                                {format(new Date(test.submission.submitted_at), 'PPP p')}
                              </p>
                            </div>
                            <Badge
                              variant={
                                percentage >= 90
                                  ? 'default'
                                  : percentage >= 70
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className="text-lg px-3 py-1"
                            >
                              {percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {hasSubmitted ? (
                        <Button variant="outline" disabled>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Completed
                        </Button>
                      ) : (
                        <Button
                          onClick={() => navigate(`/tests/take/${test.id}`)}
                          variant={isOverdue ? 'secondary' : 'default'}
                          size="lg"
                        >
                          {isOverdue ? 'Take (Late)' : 'Start Test'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
