import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Question {
  id?: string;
  question_order: number;
  question_type: 'mcq' | 'multiple_response' | 'short_answer' | 'essay' | 'true_false';
  question_text: string;
  points: number;
  correct_answer?: string;
  options?: string[];
}

export default function TestCreation() {
  const { testId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [totalPoints, setTotalPoints] = useState(100);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (testId) loadTest();
  }, [testId]);

  const loadTest = async () => {
    try {
      const [testRes, questionsRes] = await Promise.all([
        supabase.from('tests').select('*').eq('id', testId).single(),
        supabase.from('test_questions').select('*').eq('test_id', testId).order('question_order'),
      ]);

      if (testRes.data) {
        setTitle(testRes.data.title);
        setDescription(testRes.data.description || '');
        setSubject(testRes.data.subject || '');
        setTotalPoints(testRes.data.total_points);
        setTimeLimit(testRes.data.time_limit);
        setDueDate(testRes.data.due_date ? testRes.data.due_date.split('T')[0] : '');
        setIsPublished(testRes.data.is_published);
      }

      if (questionsRes.data) {
        setQuestions(
          questionsRes.data.map((q) => ({
            id: q.id,
            question_order: q.question_order,
            question_type: q.question_type as any,
            question_text: q.question_text,
            points: q.points,
            correct_answer: q.correct_answer || undefined,
            options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
          }))
        );
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_order: questions.length + 1,
        question_type: 'mcq',
        question_text: '',
        points: 1,
        options: ['', '', '', ''],
        correct_answer: '',
      },
    ]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const deleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, question_order: i + 1 })));
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    if (!updated[qIndex].options) updated[qIndex].options = [];
    updated[qIndex].options![oIndex] = value;
    setQuestions(updated);
  };

  const saveTest = async () => {
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      let savedTestId = testId;

      if (testId) {
        await supabase
          .from('tests')
          .update({
            title,
            description,
            subject,
            total_points: totalPoints,
            time_limit: timeLimit,
            due_date: dueDate || null,
            is_published: isPublished,
          })
          .eq('id', testId);

        await supabase.from('test_questions').delete().eq('test_id', testId);
      } else {
        const { data, error } = await supabase
          .from('tests')
          .insert([
            {
              teacher_id: user?.id,
              title,
              description,
              subject,
              total_points: totalPoints,
              time_limit: timeLimit,
              due_date: dueDate || null,
              is_published: isPublished,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        savedTestId = data.id;
      }

      if (questions.length > 0) {
        await supabase.from('test_questions').insert(
          questions.map((q) => ({
            test_id: savedTestId,
            question_order: q.question_order,
            question_type: q.question_type,
            question_text: q.question_text,
            points: q.points,
            correct_answer: q.correct_answer || null,
            options: q.options ? JSON.stringify(q.options) : null,
          }))
        );
      }

      toast({ title: 'Success', description: 'Test saved successfully' });
      navigate('/tests');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tests')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">{testId ? 'Edit' : 'Create'} Test</h1>
        </div>
        <Button onClick={saveTest} disabled={loading} size="lg">
          <Save className="mr-2 h-5 w-5" />
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Test  Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <Label>Total Points</Label>
              <Input type="number" value={totalPoints} onChange={(e) => setTotalPoints(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Time Limit (minutes)</Label>
              <Input
                type="number"
                value={timeLimit || ''}
                onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Publish Immediately</Label>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>Questions ({questions.length})</CardTitle>
            <Button onClick={addQuestion}>
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No questions yet. Click "Add Question" to start.</p>
          ) : (
            questions.map((q, qIndex) => (
              <Card key={qIndex} className="border-2">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between">
                    <Badge>Question {qIndex + 1}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => deleteQuestion(qIndex)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select value={q.question_type} onValueChange={(v: any) => updateQuestion(qIndex, 'question_type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mcq">Multiple Choice (Single)</SelectItem>
                          <SelectItem value="multiple_response">Multiple Choice (Multiple)</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                          <SelectItem value="short_answer">Short Answer</SelectItem>
                          <SelectItem value="essay">Essay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Points</Label>
                      <Input
                        type="number"
                        value={q.points}
                        onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Question Text *</Label>
                    <Textarea
                      value={q.question_text}
                      onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                      rows={3}
                    />
                  </div>

                  {['mcq', 'multiple_response'].includes(q.question_type) && (
                    <div className="space-y-2">
                      <Label>Options</Label>
                      {q.options?.map((opt, oIndex) => (
                        <Input
                          key={oIndex}
                          value={opt}
                          onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                          placeholder={`Option ${oIndex + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  {q.question_type === 'true_false' && (
                    <div>
                      <Label>Correct Answer</Label>
                      <Select value={q.correct_answer || ''} onValueChange={(v) => updateQuestion(qIndex, 'correct_answer', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">True</SelectItem>
                          <SelectItem value="false">False</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {['mcq', 'multiple_response'].includes(q.question_type) && (
                    <div>
                      <Label>Correct Answer (option number or comma-separated)</Label>
                      <Input
                        value={q.correct_answer || ''}
                        onChange={(e) => updateQuestion(qIndex, 'correct_answer', e.target.value)}
                        placeholder="e.g., 1 or 1,3"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
