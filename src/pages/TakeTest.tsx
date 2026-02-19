import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Clock, AlertCircle, CheckCircle, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

interface Test {
  id: string;
  title: string;
  description: string;
  subject: string;
  total_points: number;
  time_limit: number;
  due_date: string;
  show_results_immediately: boolean;
}

interface Question {
  id: string;
  question_order: number;
  question_type: string;
  question_text: string;
  question_image_url?: string;
  points: number;
  options?: string[];
  explanation?: string;
}

interface Answer {
  question_id: string;
  answer_text: string;
}

export default function TakeTest() {
  const { testId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime] = useState(Date.now());
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  useEffect(() => {
    loadTest();
  }, [testId]);

  useEffect(() => {
    if (test?.time_limit && timeRemaining !== null && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [test, timeRemaining]);

  const loadTest = async () => {
    if (!testId) return;

    setLoading(true);
    try {
      // Check if already submitted
      const { data: existingSubmission } = await supabase
        .from('test_submissions')
        .select('*, test_answers(*)')
        .eq('test_id', testId)
        .eq('student_id', user?.id)
        .single();

      if (existingSubmission) {
        setHasSubmitted(true);
        setSubmissionResult(existingSubmission);
        
        // Load test and questions for review
        const [testResponse, questionsResponse] = await Promise.all([
          supabase.from('tests').select('*').eq('id', testId).single(),
          supabase.from('test_questions').select('*').eq('test_id', testId).order('question_order'),
        ]);

        if (testResponse.data) setTest(testResponse.data);
        if (questionsResponse.data) {
          setQuestions(
            questionsResponse.data.map((q) => ({
              ...q,
              options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
            }))
          );
        }
        
        setLoading(false);
        return;
      }

      // Load test and questions
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .eq('is_published', true)
        .single();

      if (testError) throw testError;

      if (!testData) {
        toast({
          title: 'Error',
          description: 'Test not found or not published',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }

      setTest(testData);

      if (testData.time_limit) {
        setTimeRemaining(testData.time_limit * 60); // Convert to seconds
      }

      const { data: questionsData, error: questionsError } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', testId)
        .order('question_order');

      if (questionsError) throw questionsError;

      setQuestions(
        questionsData.map((q) => ({
          ...q,
          options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
        }))
      );

      // Create submission record
      const { error: submissionError } = await supabase
        .from('test_submissions')
        .insert([
          {
            test_id: testId,
            student_id: user?.id,
            started_at: new Date().toISOString(),
          },
        ]);

      if (submissionError) throw submissionError;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load test',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSubmit = async () => {
    toast({
      title: 'Time\'s Up!',
      description: 'Submitting your test automatically...',
    });
    await submitTest();
  };

  const submitTest = async () => {
    setSubmitting(true);
    try {
      // Get submission ID
      const { data: submission } = await supabase
        .from('test_submissions')
        .select('id')
        .eq('test_id', testId)
        .eq('student_id', user?.id)
        .single();

      if (!submission) throw new Error('Submission not found');

      // Save all answers
      const answersToInsert = Object.entries(answers).map(([questionId, answerText]) => ({
        submission_id: submission.id,
        question_id: questionId,
        answer_text: answerText,
      }));

      const { error: answersError } = await supabase
        .from('test_answers')
        .insert(answersToInsert);

      if (answersError) throw answersError;

      // Update submission as completed
      const timeElapsed = Math.floor((Date.now() - startTime) / 1000);
      const { error: updateError } = await supabase
        .from('test_submissions')
        .update({
          submitted_at: new Date().toISOString(),
          time_taken: timeElapsed,
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      // Fetch results
      const { data: result } = await supabase
        .from('test_submissions')
        .select('*')
        .eq('id', submission.id)
        .single();

      setSubmissionResult(result);
      setHasSubmitted(true);

      toast({
        title: 'Success',
        description: 'Test submitted successfully!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit test',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setSubmitDialogOpen(false);
    }
  };

  const updateAnswer = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const answered = Object.keys(answers).length;
    return (answered / questions.length) * 100;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading test...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!test) return null;

  if (hasSubmitted && submissionResult) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card className="border-green-500">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Test Submitted!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                Your test has been submitted successfully.
              </p>
              {test.show_results_immediately && submissionResult.score !== null && (
                <div className="pt-4">
                  <p className="text-4xl font-bold">
                    {submissionResult.score} / {submissionResult.total_points}
                  </p>
                  <p className="text-muted-foreground">
                    {((submissionResult.score / submissionResult.total_points) * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {!test.show_results_immediately && (
                <p className="text-muted-foreground pt-4">
                  Your teacher will review your submission and post results soon.
                </p>
              )}
            </div>
            <div className="flex justify-center gap-2 pt-4">
              <Button onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{test.title}</CardTitle>
              {test.subject && <Badge className="mt-2">{test.subject}</Badge>}
              <p className="text-muted-foreground mt-2">{test.description}</p>
            </div>
            {timeRemaining !== null && (
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="h-5 w-5" />
                <span
                  className={timeRemaining < 300 ? 'text-destructive' : ''}
                >
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress: {Object.keys(answers).length} / {questions.length} answered</span>
              <span>{getProgress().toFixed(0)}%</span>
            </div>
            <Progress value={getProgress()} />
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Badge variant="outline">Q{index + 1}</Badge>
                <div className="flex-1">
                  <p className="font-medium text-lg">{question.question_text}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {question.points} {question.points === 1 ? 'point' : 'points'}
                  </p>
                </div>
              </div>

              {question.question_image_url && (
                <div className="mt-4">
                  <img
                    src={question.question_image_url}
                    alt="Question"
                    className="max-w-full rounded border"
                  />
                </div>
              )}

              <div className="mt-4">
                {question.question_type === 'mcq' && (
                  <RadioGroup
                    value={answers[question.id] || ''}
                    onValueChange={(value) => updateAnswer(question.id, value)}
                  >
                    {question.options?.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center space-x-2 p-3 rounded hover:bg-accent">
                        <RadioGroupItem value={option} id={`${question.id}-${oIndex}`} />
                        <Label htmlFor={`${question.id}-${oIndex}`} className="flex-1 cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {question.question_type === 'true_false' && (
                  <RadioGroup
                    value={answers[question.id] || ''}
                    onValueChange={(value) => updateAnswer(question.id, value)}
                  >
                    <div className="flex items-center space-x-2 p-3 rounded hover:bg-accent">
                      <RadioGroupItem value="True" id={`${question.id}-true`} />
                      <Label htmlFor={`${question.id}-true`} className="flex-1 cursor-pointer">
                        True
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded hover:bg-accent">
                      <RadioGroupItem value="False" id={`${question.id}-false`} />
                      <Label htmlFor={`${question.id}-false`} className="flex-1 cursor-pointer">
                        False
                      </Label>
                    </div>
                  </RadioGroup>
                )}

                {question.question_type === 'short_answer' && (
                  <Input
                    value={answers[question.id] || ''}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    placeholder="Type your answer here..."
                  />
                )}

                {question.question_type === 'essay' && (
                  <Textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    placeholder="Type your answer here..."
                    rows={6}
                  />
                )}

                {question.question_type === 'multiple_response' && (
                  <div className="space-y-2">
                    {question.options?.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center space-x-2 p-3 rounded hover:bg-accent">
                        <Checkbox
                          id={`${question.id}-${oIndex}`}
                          checked={answers[question.id]?.includes(option)}
                          onCheckedChange={(checked) => {
                            const current = answers[question.id]?.split(',').filter(Boolean) || [];
                            if (checked) {
                              updateAnswer(question.id, [...current, option].join(','));
                            } else {
                              updateAnswer(
                                question.id,
                                current.filter((o) => o !== option).join(',')
                              );
                            }
                          }}
                        />
                        <Label htmlFor={`${question.id}-${oIndex}`} className="flex-1 cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Submit Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                Make sure to review all your answers before submitting.
              </span>
            </div>
            <Button
              size="lg"
              onClick={() => setSubmitDialogOpen(true)}
              disabled={submitting}
            >
              <Send className="h-5 w-5 mr-2" />
              {submitting ? 'Submitting...' : 'Submit Test'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {Object.keys(answers).length} out of {questions.length}{' '}
              questions. Once submitted, you cannot change your answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Review Answers</AlertDialogCancel>
            <AlertDialogAction onClick={submitTest}>
              Submit Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
