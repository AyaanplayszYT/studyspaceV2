import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Users, CheckCircle, Clock, AlertCircle, Eye, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

interface Test {
  id: string;
  title: string;
  description: string;
  subject: string;
  total_points: number;
  time_limit: number;
  due_date: string;
  is_published: boolean;
  created_at: string;
  submission_count?: number;
  question_count?: number;
}

export default function TestsManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndFetchTests();
  }, [user]);

  const checkAdminAndFetchTests = async () => {
    if (!user) return;

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      toast({
        title: 'Access Denied',
        description: 'You must be an admin/teacher to access this page.',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    setIsAdmin(true);
    fetchTests();
  };

  const fetchTests = async () => {
    setLoading(true);
    try {
      // Fetch tests created by this teacher
      const { data: testsData, error } = await supabase
        .from('tests')
        .select(`
          *,
          test_questions (count),
          test_submissions (count)
        `)
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include counts
      const transformedTests = testsData?.map(test => ({
        ...test,
        question_count: test.test_questions?.[0]?.count || 0,
        submission_count: test.test_submissions?.[0]?.count || 0,
      })) || [];

      setTests(transformedTests);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch tests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = () => {
    navigate('/tests/create');
  };

  const handleEditTest = (testId: string) => {
    navigate(`/tests/edit/${testId}`);
  };

  const handleViewReports = (testId: string) => {
    navigate(`/tests/reports/${testId}`);
  };

  const handleDeleteTest = async () => {
    if (!testToDelete) return;

    try {
      const { error } = await supabase
        .from('tests')
        .delete()
        .eq('id', testToDelete);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test deleted successfully',
      });

      fetchTests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete test',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setTestToDelete(null);
    }
  };

  const togglePublish = async (testId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('tests')
        .update({ is_published: !currentStatus })
        .eq('id', testId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Test ${!currentStatus ? 'published' : 'unpublished'} successfully`,
      });

      fetchTests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update test',
        variant: 'destructive',
      });
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tests & Assignments</h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and review student assessments
          </p>
        </div>
        <Button onClick={handleCreateTest} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Create New Test
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tests</p>
                <p className="text-3xl font-bold">{tests.length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-3xl font-bold">
                  {tests.filter(t => t.is_published).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
                <p className="text-3xl font-bold">
                  {tests.reduce((sum, t) => sum + (t.submission_count || 0), 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tests List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Loading tests...</p>
            </CardContent>
          </Card>
        ) : tests.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No tests created yet</p>
              <p className="text-muted-foreground mb-4">
                Create your first test to get started
              </p>
              <Button onClick={handleCreateTest}>
                <Plus className="h-4 w-4 mr-2" />
                Create Test
              </Button>
            </CardContent>
          </Card>
        ) : (
          tests.map((test) => (
            <Card key={test.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">{test.title}</CardTitle>
                      <Badge variant={test.is_published ? 'default' : 'secondary'}>
                        {test.is_published ? 'Published' : 'Draft'}
                      </Badge>
                      {test.subject && (
                        <Badge variant="outline">{test.subject}</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-2">
                      {test.description || 'No description provided'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{test.question_count || 0} Questions</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{test.submission_count || 0} Submissions</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{test.time_limit ? `${test.time_limit} min` : 'No limit'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span>{test.total_points} points</span>
                  </div>
                </div>

                {test.due_date && (
                  <p className="text-sm text-muted-foreground mb-4">
                    Due: {format(new Date(test.due_date), 'PPP p')}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTest(test.id)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewReports(test.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Reports
                  </Button>
                  <Button
                    variant={test.is_published ? 'secondary' : 'default'}
                    size="sm"
                    onClick={() => togglePublish(test.id, test.is_published)}
                  >
                    {test.is_published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setTestToDelete(test.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the test and all associated submissions.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTest} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
