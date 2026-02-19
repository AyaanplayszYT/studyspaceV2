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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Image as ImageIcon,
  GripVertical,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Question {
  id?: string;
  question_order: number;
  question_type: 'mcq' | 'multiple_response' | 'short_answer' | 'essay' | 'true_false';
  question_text: string;
  question_image_url?: string;
  points: number;
  correct_answer?: string;
  options?: string[];
  explanation?: string;
}

interface TestForm {
  title: string;
  description: string;
  subject: string;
  total_points: number;
  time_limit: number | null;
  due_date: string;
  is_published: boolean;
  allow_late_submission: boolean;
  show_results_immediately: boolean;
}

export default function TestCreation() {
  const { testId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const [testForm, setTestForm] = useState<TestForm>({
    title: '',
    description: '',
    subject: '',
    total_points: 100,
    time_limit: null,
    due_date: '',
    is_published: false,
    allow_late_submission: false,
    show_results_immediately: true,
  });

  const [questions, setQuestions] = useState<Question[]>([]);

  const loadTest = async () => {
    if (!testId) return;

    setInitialLoading(true);
    try {
      // Load test details
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;

      setTestForm({
        title: testData.title,
        description: testData.description || '',
        subject: testData.subject || '',
        total_points: testData.total_points,
        time_limit: testData.time_limit,
        due_date: testData.due_date ? testData.due_date.split('T')[0] : '',
        is_published: testData.is_published,
        allow_late_submission: testData.allow_late_submission,
        show_results_immediately: testData.show_results_immediately,
      });

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', testId)
        .order('question_order');

      if (questionsError) throw questionsError;

      setQuestions(
        questionsData.map((q) => ({
          id: q.id,
          question_order: q.question_order,
          question_type: q.question_type as 'mcq' | 'multiple_response' | 'short_answer' | 'essay' | 'true_false',
          question_text: q.question_text,
          question_image_url: q.question_image_url || undefined,
          points: q.points,
          correct_answer: q.correct_answer || undefined,
          options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
          explanation: q.explanation || undefined,
        }))
      );
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load test',
        variant: 'destructive',
      });
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (testId) {
      loadTest();
    } else {
      setInitialLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, user]);

  const addQuestion = () => {
    const newQuestion: Question = {
      question_order: questions.length + 1,
      question_type: 'mcq',
      question_text: '',
      points: 1,
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const deleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    // Reorder questions
    updated.forEach((q, i) => {
      q.question_order = i + 1;
    });
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    if (!updated[questionIndex].options) {
      updated[questionIndex].options = [];
    }
    updated[questionIndex].options![optionIndex] = value;
    setQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    if (!updated[questionIndex].options) {
      updated[questionIndex].options = [];
    }
    updated[questionIndex].options!.push('');
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options = updated[questionIndex].options?.filter(
      (_, i) => i !== optionIndex
    );
    setQuestions(updated);
  };

  const handleImageUpload = async (questionIndex: number, file: File) => {
    setUploadingImage(questionIndex);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('test-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('test-images')
        .getPublicUrl(fileName);

      updateQuestion(questionIndex, 'question_image_url', publicUrl);

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(null);
    }
  };

  const saveTest = async () => {
    if (!testForm.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a test title',
        variant: 'destructive',
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one question',
        variant: 'destructive',
      });
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        toast({
          title: 'Validation Error',
          description: `Question ${i + 1} is missing text`,
          variant: 'destructive',
        });
        return;
      }

      if (['mcq', 'multiple_response'].includes(q.question_type)) {
        if (!q.options || q.options.length < 2) {
          toast({
            title: 'Validation Error',
            description: `Question ${i + 1} needs at least 2 options`,
            variant: 'destructive',
          });
          return;
        }
        if (!q.correct_answer) {
          toast({
            title: 'Validation Error',
            description: `Question ${i + 1} needs a correct answer`,
            variant: 'destructive',
          });
          return;
        }
      }

      if (q.question_type === 'true_false' && !q.correct_answer) {
        toast({
          title: 'Validation Error',
          description: `Question ${i + 1} needs a correct answer (True/False)`,
          variant: 'destructive',
        });
        return;
      }
    }

    setSaving(true);
    try {
      let savedTestId = testId;

      // Save or update test
      if (testId) {
        const { error } = await supabase
          .from('tests')
          .update({
            ...testForm,
            due_date: testForm.due_date || null,
            time_limit: testForm.time_limit || null,
          })
          .eq('id', testId);

        if (error) throw error;

        // Delete existing questions
        await supabase.from('test_questions').delete().eq('test_id', testId);
      } else {
        const { data, error } = await supabase
          .from('tests')
          .insert([
            {
              ...testForm,
              teacher_id: user?.id,
              due_date: testForm.due_date || null,
              time_limit: testForm.time_limit || null,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        savedTestId = data.id;
      }

      // Save questions
      const questionsToInsert = questions.map((q) => ({
        test_id: savedTestId,
        question_order: q.question_order,
        question_type: q.question_type,
        question_text: q.question_text,
        question_image_url: q.question_image_url,
        points: q.points,
        correct_answer: q.correct_answer || null,
        options: q.options ? JSON.stringify(q.options) : null,
        explanation: q.explanation || null,
      }));

      const { error: questionsError } = await supabase
        .from('test_questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast({
        title: 'Success',
        description: testId ? 'Test updated successfully' : 'Test created successfully',
      });

      navigate('/tests');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save test',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tests')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {testId ? 'Edit Test' : 'Create New Test'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Build comprehensive assessments with multiple question types
            </p>
          </div>
        </div>
        <Button onClick={saveTest} disabled={saving} size="lg">
          <Save className="h-5 w-5 mr-2" />
          {saving ? 'Saving...' : 'Save Test'}
        </Button>
      </div>

      {/* Test Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Test Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={testForm.title}
                onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                placeholder="e.g., Final Exam - Math"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={testForm.subject}
                onChange={(e) => setTestForm({ ...testForm, subject: e.target.value })}
                placeholder="e.g., Mathematics"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={testForm.description}
              onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
              placeholder="Describe what this test covers..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_points">Total Points</Label>
              <Input
                id="total_points"
                type="number"
                value={testForm.total_points}
                onChange={(e) =>
                  setTestForm({ ...testForm, total_points: parseInt(e.target.value) || 0 })
                }
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time_limit">Time Limit (minutes)</Label>
              <Input
                id="time_limit"
                type="number"
                value={testForm.time_limit || ''}
                onChange={(e) =>
                  setTestForm({
                    ...testForm,
                    time_limit: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="No limit"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="datetime-local"
                value={testForm.due_date}
                onChange={(e) => setTestForm({ ...testForm, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_published">Publish Immediately</Label>
              <Switch
                id="is_published"
                checked={testForm.is_published}
                onCheckedChange={(checked) =>
                  setTestForm({ ...testForm, is_published: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="allow_late">Allow Late Submissions</Label>
              <Switch
                id="allow_late"
                checked={testForm.allow_late_submission}
                onCheckedChange={(checked) =>
                  setTestForm({ ...testForm, allow_late_submission: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show_results">Show Results Immediately</Label>
              <Switch
                id="show_results"
                checked={testForm.show_results_immediately}
                onCheckedChange={(checked) =>
                  setTestForm({ ...testForm, show_results_immediately: checked })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Questions ({questions.length})</CardTitle>
            <Button onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No questions added yet. Click "Add Question" to get started.</p>
            </div>
          ) : (
            questions.map((question, qIndex) => (
              <Card key={qIndex} className="border-2">
                <CardContent className="pt-6 space-y-4">
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <Badge>Question {qIndex + 1}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteQuestion(qIndex)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Question Type and Points */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <Select
                        value={question.question_type}
                        onValueChange={(value: any) =>
                          updateQuestion(qIndex, 'question_type', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mcq">Multiple Choice (Single)</SelectItem>
                          <SelectItem value="multiple_response">
                            Multiple Choice (Multiple)
                          </SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                          <SelectItem value="short_answer">Short Answer</SelectItem>
                          <SelectItem value="essay">Essay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Points</Label>
                      <Input
                        type="number"
                        value={question.points}
                        onChange={(e) =>
                          updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)
                        }
                        min="1"
                      />
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="space-y-2">
                    <Label>Question Text *</Label>
                    <Textarea
                      value={question.question_text}
                      onChange={(e) =>
                        updateQuestion(qIndex, 'question_text', e.target.value)
                      }
                      placeholder="Enter your question here..."
                      rows={3}
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label>Question Image (Optional)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(qIndex, file);
                        }}
                        disabled={uploadingImage === qIndex}
                        className="flex-1"
                      />
                      {question.question_image_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuestion(qIndex, 'question_image_url', '')}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    {question.question_image_url && (
                      <div className="mt-2">
                        <img
                          src={question.question_image_url}
                          alt="Question"
                          className="max-w-md rounded border"
                        />
                      </div>
                    )}
                  </div>

                  {/* Options for MCQ/Multiple Response */}
                  {['mcq', 'multiple_response'].includes(question.question_type) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Answer Options *</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(qIndex)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Option
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {question.options?.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <Input
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                              placeholder={`Option ${oIndex + 1}`}
                            />
                            {question.options && question.options.length > 2 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOption(qIndex, oIndex)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Correct Answer */}
                  {question.question_type === 'true_false' && (
                    <div className="space-y-2">
                      <Label>Correct Answer *</Label>
                      <Select
                        value={question.correct_answer}
                        onValueChange={(value) =>
                          updateQuestion(qIndex, 'correct_answer', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select correct answer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="True">True</SelectItem>
                          <SelectItem value="False">False</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {['mcq', 'multiple_response'].includes(question.question_type) && (
                    <div className="space-y-2">
                      <Label>Correct Answer *</Label>
                      <Select
                        value={question.correct_answer}
                        onValueChange={(value) =>
                          updateQuestion(qIndex, 'correct_answer', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select correct answer" />
                        </SelectTrigger>
                        <SelectContent>
                          {question.options?.map((option, oIndex) => (
                            <SelectItem key={oIndex} value={option}>
                              {option || `Option ${oIndex + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {question.question_type === 'short_answer' && (
                    <div className="space-y-2">
                      <Label>Expected Answer (Optional - for auto-grading)</Label>
                      <Input
                        value={question.correct_answer || ''}
                        onChange={(e) =>
                          updateQuestion(qIndex, 'correct_answer', e.target.value)
                        }
                        placeholder="Expected answer..."
                      />
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="space-y-2">
                    <Label>Explanation (Optional)</Label>
                    <Textarea
                      value={question.explanation || ''}
                      onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                      placeholder="Explain the correct answer..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Bottom Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveTest} disabled={saving} size="lg">
          <Save className="h-5 w-5 mr-2" />
          {saving ? 'Saving...' : 'Save Test'}
        </Button>
      </div>
    </div>
  );
}
