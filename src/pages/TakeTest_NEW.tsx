import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Clock, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface Question {
  id: string;
  question_order: number;
  question_type: string;
  question_text: string;
  points: number;
  options: any;
}

export default function TakeTest() {
  const { testId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (testId && user) loadTest();
  }, [testId, user]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => (prev ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const loadTest = async () => {
    try {
      const [testRes, questionsRes, submissionRes] = await Promise.all([
        supabase.from('tests').select('*').eq('id', testId).eq('is_published', true).single(),
        supabase.from('test_questions').select('*').eq('test_id', testId).order('question_order'),
        supabase.from('test_submissions').select('*').eq('test_id', testId).eq('student_id', user?.id).maybeSingle(),
      ]);

      if (submissionRes.data?.submitted_at) {
        toast({ title: 'Already Submitted', description: 'You already submitted this test' });
        navigate('/tests/catalogue');
        return;
      }

      setTest(testRes.data);
      setQuestions(
        questionsRes.data?.map((q) => ({
          ...q,
          options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
        })) || []
      );

      if (testRes.data?.time_limit) {
        setTimeLeft(testRes.data.time_limit * 60);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      navigate('/tests/catalogue');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Create or update submission
      const { data: submission, error: subError } = await supabase
        .from('test_submissions')
        .upsert([
          {
            test_id: testId,
            student_id: user?.id,
            submitted_at: new Date().toISOString(),
            score: 0,
          },
        ])
        .select()
        .single();

      if (subError) throw subError;

      // Save answers
      const answerRecords = Object.entries(answers).map(([questionId, answer]) => ({
        submission_id: submission.id,
        question_id: questionId,
        answer_text: typeof answer === 'object' ? JSON.stringify(answer) : String(answer),
      }));

      if (answerRecords.length > 0) {
        await supabase.from('test_answers').insert(answerRecords);
      }

      toast({ title: 'Success', description: 'Test submitted successfully' });
      navigate('/tests/catalogue');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="p-8 text-center">Loading test...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{test?.title}</h1>
          {test?.description && <p className="text-muted-foreground">{test.description}</p>}
        </div>
        {timeLeft !== null && (
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span className="text-2xl font-bold">{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {questions.map((q, index) => (
          <Card key={q.id}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between">
                <h3 className="font-semibold">
                  Question {index + 1}
                  <Badge className="ml-2" variant="outline">
                    {q.points} pts
                  </Badge>
                </h3>
              </div>

              <p className="text-lg">{q.question_text}</p>

              {q.question_type === 'mcq' && (
                <RadioGroup value={answers[q.id] || ''} onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}>
                  {q.options?.map((opt: string, i: number) => (
                    <div key={i} className="flex items-center space-x-2">
                      <RadioGroupItem value={String(i + 1)} id={`${q.id}-${i}`} />
                      <Label htmlFor={`${q.id}-${i}`}>{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {q.question_type === 'multiple_response' && (
                <div className="space-y-2">
                  {q.options?.map((opt: string, i: number) => (
                    <div key={i} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${q.id}-${i}`}
                        checked={(answers[q.id] || []).includes(i + 1)}
                        onCheckedChange={(checked) => {
                          const current = answers[q.id] || [];
                          setAnswers({
                            ...answers,
                            [q.id]: checked ? [...current, i + 1] : current.filter((x: number) => x !== i + 1),
                          });
                        }}
                      />
                      <Label htmlFor={`${q.id}-${i}`}>{opt}</Label>
                    </div>
                  ))}
                </div>
              )}

              {q.question_type === 'true_false' && (
                <RadioGroup value={answers[q.id] || ''} onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id={`${q.id}-true`} />
                    <Label htmlFor={`${q.id}-true`}>True</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id={`${q.id}-false`} />
                    <Label htmlFor={`${q.id}-false`}>False</Label>
                  </div>
                </RadioGroup>
              )}

              {['short_answer', 'essay'].includes(q.question_type) && (
                <Textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Type your answer here..."
                  rows={q.question_type === 'essay' ? 6 : 3}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting} size="lg">
          <Send className="mr-2 h-5 w-5" />
          {submitting ? 'Submitting...' : 'Submit Test'}
        </Button>
      </div>
    </div>
  );
}
