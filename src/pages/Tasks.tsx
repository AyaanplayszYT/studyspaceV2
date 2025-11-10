import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, CheckCircle2, Circle, Trash2 } from 'lucide-react';
  const handleDeleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: 'Task deleted successfully',
      });
      fetchTasks();
    }
  };

interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  due_date: string | null;
  created_at: string;
}

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('tasks').insert({
      user_id: user?.id,
      title,
      description: description || null,
      due_date: dueDate || null,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
      setOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      fetchTasks();
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !completed })
      .eq('id', taskId);

    if (!error) {
      fetchTasks();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Track your assignments and deadlines</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date (Optional)</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">Create Task</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id} className="shadow-card hover:shadow-card-hover transition-smooth">
            <CardContent className="flex items-start gap-4 pt-6">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id, task.completed)}
                className="mt-1"
              />
              <div className="flex-1">
                <h3 className={`font-semibold ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                )}
                {task.due_date && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Due: {new Date(task.due_date).toLocaleString()}
                  </p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDeleteTask(task.id)}
                aria-label="Delete Task"
              >
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-accent" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {tasks.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tasks yet. Create your first one!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Tasks;
