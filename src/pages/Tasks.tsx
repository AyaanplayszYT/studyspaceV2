import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
import { Plus, CheckCircle2, Circle, Trash2, Bold, Italic, Underline, List, Paperclip, X, Download, Edit, Filter, ArrowUpDown, Star, Download as DownloadIcon, CheckSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { uploadFile, deleteFile, getFileUrl, formatFileSize, getFileIcon, isImageFile, getImagePreview } from '@/lib/file-upload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TasksGridSkeleton } from '@/components/SkeletonLoaders';

interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  due_date: string | null;
  created_at: string;
  user_id: string;
}

interface TaskAttachment {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  created_at: string;
}

// Component to handle line breaks and spacing in task descriptions
const TaskDescription = ({ content }: { content: string }) => {
  return (
    <div className="space-y-0">
      {content.split('\n').map((line, index) => {
        // Preserve empty lines with a non-breaking space
        if (line.trim() === '') {
          return <div key={index} className="h-3">&nbsp;</div>;
        }
        return (
          <div key={index} className="prose prose-sm dark:prose-invert prose-headings:text-xs prose-p:text-sm prose-li:text-sm max-w-none">
            <ReactMarkdown>{line}</ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
};

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tasksLocked, setTasksLocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ [key: string]: string }>({});
  const [dragActive, setDragActive] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'due' | 'title'>('created');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [pinnedTasks, setPinnedTasks] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoized filtered and sorted tasks for better performance
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' ? true :
        filterStatus === 'completed' ? task.completed : !task.completed;
      
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      // Pinned tasks always come first
      const aPinned = pinnedTasks.has(a.id);
      const bPinned = pinnedTasks.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      // Then apply regular sorting
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'due') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [tasks, searchQuery, filterStatus, sortBy, pinnedTasks]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    const overdue = tasks.filter(t => 
      !t.completed && t.due_date && new Date(t.due_date) < new Date()
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, active, overdue, completionRate };
  }, [tasks]);

  // Check if tasks are locked and if user is admin
  useEffect(() => {
    const checkSettings = async () => {
      const { data: settings } = await supabase.from('settings').select('tasks_locked').single() as any;
      if (settings) setTasksLocked(settings.tasks_locked);

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user?.id)
        .single() as any;
      if (profile) setIsAdmin(profile.is_admin);
    };

    checkSettings();
  }, [user]);

  // Formatting functions
  const insertFormatting = (before: string, after: string = '') => {
    if (!descriptionRef.current) return;
    const start = descriptionRef.current.selectionStart;
    const end = descriptionRef.current.selectionEnd;
    const selectedText = description.substring(start, end) || 'text';
    const newDescription = description.substring(0, start) + before + selectedText + after + description.substring(end);
    setDescription(newDescription);
  };

  // File upload handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedAttachments([...selectedAttachments, ...files]);
    
    // Generate previews for images
    for (const file of files) {
      if (isImageFile(file.type)) {
        const preview = await getImagePreview(file);
        setFilePreviews(prev => ({ ...prev, [file.name]: preview }));
      }
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files || []);
    setSelectedAttachments([...selectedAttachments, ...files]);
    
    // Generate previews for images
    for (const file of files) {
      if (isImageFile(file.type)) {
        const preview = await getImagePreview(file);
        setFilePreviews(prev => ({ ...prev, [file.name]: preview }));
      }
    }
  };

  const removeSelectedFile = (index: number) => {
    const removedFile = selectedAttachments[index];
    setSelectedAttachments(selectedAttachments.filter((_, i) => i !== index));
    setFilePreviews(prev => {
      const updated = { ...prev };
      delete updated[removedFile.name];
      return updated;
    });
  };

  const uploadAttachments = async (taskId: string) => {
    if (selectedAttachments.length === 0) return;
    
    setUploading(true);
    try {
      for (const file of selectedAttachments) {
        const result = await uploadFile(file, 'task-attachments', user?.id || '');
        
        if (result.success && result.path) {
          // Save attachment metadata to database
          const { error } = await supabase.from('task_attachments').insert({
            task_id: taskId,
            user_id: user?.id,
            file_name: result.fileName,
            file_size: result.fileSize,
            file_type: result.fileType,
            storage_path: result.path,
          });

          if (error) {
            toast({
              title: 'Error',
              description: 'Failed to save attachment metadata',
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to upload file',
            variant: 'destructive',
          });
        }
      }
      
      setSelectedAttachments([]);
      await fetchTaskAttachments(taskId);
      
      toast({
        title: 'Success',
        description: `${selectedAttachments.length} file(s) uploaded`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload attachments',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const fetchTaskAttachments = async (taskId: string) => {
    const { data, error } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId);

    if (!error && data) {
      setAttachments(data);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, storagePath: string) => {
    try {
      // Delete from storage
      const result = await deleteFile('task-attachments', storagePath);
      
      if (result.success) {
        // Delete from database
        const { error } = await supabase
          .from('task_attachments')
          .delete()
          .eq('id', attachmentId);

        if (!error) {
          setAttachments(attachments.filter(a => a.id !== attachmentId));
          toast({
            title: 'Success',
            description: 'Attachment deleted',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete attachment',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  // Load pinned tasks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pinnedTasks');
    if (saved) {
      setPinnedTasks(new Set(JSON.parse(saved)));
    }
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data);
      // Load attachments for all tasks
      if (data.length > 0) {
        const { data: attachmentData } = await supabase
          .from('task_attachments')
          .select('*')
          .in('task_id', data.map(t => t.id));
        if (attachmentData) {
          setAttachments(attachmentData);
        }
      }
    }
    setLoading(false);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if tasks are locked
    if (tasksLocked && !isAdmin) {
      toast({
        title: 'Tasks Locked',
        description: 'Only admins can create tasks at this time.',
        variant: 'destructive',
      });
      return;
    }

    const { data, error } = await supabase.from('tasks').insert({
      user_id: user?.id,
      title,
      description: description || null,
      due_date: dueDate || null,
    }).select().single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    } else {
      // Upload attachments if any
      if (selectedAttachments.length > 0) {
        await uploadAttachments(data.id);
      }

      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
      setOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setSelectedAttachments([]);
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

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.due_date || '');
    setEditOpen(true);
    setExpandedTask(null);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !title.trim()) {
      toast({
        title: 'Error',
        description: 'Title is required',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
      })
      .eq('id', editingTask.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
      setEditOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setEditingTask(null);
      fetchTasks();
    }
  };

  // Bulk actions
  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const selectAllTasks = () => {
    if (selectedTasks.size === filteredAndSortedTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredAndSortedTasks.map(t => t.id)));
    }
  };

  const bulkDeleteTasks = async () => {
    if (selectedTasks.size === 0) return;
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', Array.from(selectedTasks));
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete tasks',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `${selectedTasks.size} task(s) deleted successfully`,
      });
      setSelectedTasks(new Set());
      fetchTasks();
    }
  };

  const bulkToggleComplete = async () => {
    if (selectedTasks.size === 0) return;
    
    const tasksToUpdate = tasks.filter(t => selectedTasks.has(t.id));
    const allCompleted = tasksToUpdate.every(t => t.completed);
    
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !allCompleted })
      .in('id', Array.from(selectedTasks));
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tasks',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `${selectedTasks.size} task(s) ${allCompleted ? 'marked as incomplete' : 'completed'}`,
      });
      setSelectedTasks(new Set());
      fetchTasks();
    }
  };

  // Pin/Unpin tasks
  const togglePin = (taskId: string) => {
    const newPinned = new Set(pinnedTasks);
    if (newPinned.has(taskId)) {
      newPinned.delete(taskId);
      toast({ title: 'Task unpinned' });
    } else {
      newPinned.add(taskId);
      toast({ title: 'Task pinned to top' });
    }
    setPinnedTasks(newPinned);
    localStorage.setItem('pinnedTasks', JSON.stringify(Array.from(newPinned)));
  };

  // Export functionality
  const exportToMarkdown = () => {
    let markdown = '# My Tasks\n\n';
    markdown += `Generated on ${new Date().toLocaleDateString()}\n\n`;
    
    filteredAndSortedTasks.forEach(task => {
      markdown += `## ${task.completed ? '[x]' : '[ ]'} ${task.title}\n\n`;
      if (task.description) {
        markdown += `${task.description}\n\n`;
      }
      if (task.due_date) {
        markdown += `**Due:** ${new Date(task.due_date).toLocaleString()}\n\n`;
      }
      markdown += '---\n\n';
    });
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exported!',
      description: 'Tasks exported as Markdown file',
    });
  };

  const exportToJSON = () => {
    const data = {
      exported: new Date().toISOString(),
      tasks: filteredAndSortedTasks.map(t => ({
        title: t.title,
        description: t.description,
        completed: t.completed,
        due_date: t.due_date,
        created_at: t.created_at,
      })),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exported!',
      description: 'Tasks exported as JSON file',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Track your assignments and deadlines</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedTasks.size > 0 && (
            <>
              <Badge variant="secondary" className="px-3 py-1">
                {selectedTasks.size} selected
              </Badge>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={bulkToggleComplete}
                className="gap-2"
              >
                <CheckSquare className="h-4 w-4" />
                Toggle Complete
              </Button>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={bulkDeleteTasks}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          )}
          <Select onValueChange={(value) => value === 'markdown' ? exportToMarkdown() : exportToJSON()}>
            <SelectTrigger className="w-[140px]">
              <DownloadIcon className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="markdown">Markdown</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onValueChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={tasksLocked && !isAdmin} title={tasksLocked && !isAdmin ? 'Tasks are locked - only admins can create' : ''}>
                <Plus className="h-4 w-4" />
                Create Task
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <p className="text-sm text-muted-foreground">Add a new task to your list. All fields except title are optional.</p>
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
                <div className="flex gap-1 mb-2 flex-wrap">
                  <Button type="button" size="sm" variant="outline" onClick={() => insertFormatting('**', '**')} title="Bold">
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => insertFormatting('*', '*')} title="Italic">
                    <Italic className="w-4 h-4" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => insertFormatting('__', '__')} title="Underline">
                    <Underline className="w-4 h-4" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => insertFormatting('- ', '')} title="List">
                    <List className="w-4 h-4" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => insertFormatting('# ', '')} title="Heading">
                    H1
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => insertFormatting('`', '`')} title="Code">
                    &lt;/&gt;
                  </Button>
                </div>
                <Textarea
                  ref={descriptionRef}
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Use formatting buttons above or type markdown..."
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

              {/* File Upload Section */}
              <div className="space-y-2 w-full">
                <Label>Attachments (Optional)</Label>
                
                {/* Drag & Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition ${
                    dragActive
                      ? 'border-accent bg-accent/10'
                      : 'border-muted-foreground/30 hover:border-accent/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="*/*"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm">
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-0 h-auto"
                      >
                        Click to upload
                      </Button>
                      <span className="text-muted-foreground"> or drag and drop files here</span>
                    </div>
                  </div>
                </div>

                {/* Selected Files Preview */}
                {selectedAttachments.length > 0 && (
                  <div className="space-y-3 p-3 bg-secondary/30 rounded-md">
                    <div className="grid grid-cols-2 gap-2">
                      {selectedAttachments.map((file, idx) => (
                        <div key={idx} className="relative group">
                          {filePreviews[file.name] ? (
                            // Image Thumbnail
                            <div className="relative">
                              <img
                                src={filePreviews[file.name]}
                                alt={file.name}
                                className="w-full h-24 object-cover rounded-md"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-md flex items-center justify-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSelectedFile(idx)}
                                  className="text-white hover:bg-red-500/50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <p className="text-xs mt-1 truncate">{file.name}</p>
                            </div>
                          ) : (
                            // File Item
                            <div className="flex items-center justify-between p-2 bg-secondary/50 rounded text-sm">
                              <span className="text-xl">{getFileIcon(file.type)}</span>
                              <div className="flex-1 mx-2 truncate">
                                <p className="truncate text-xs">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSelectedFile(idx)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? 'Creating & Uploading...' : 'Create Task'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingTask(null);
          setTitle('');
          setDescription('');
          setDueDate('');
        }
        setEditOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <div className="flex gap-1 mb-2 flex-wrap">
                <Button type="button" size="sm" variant="outline" onClick={() => insertFormatting('**', '**')} title="Bold">
                  <Bold className="w-4 h-4" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => insertFormatting('*', '*')} title="Italic">
                  <Italic className="w-4 h-4" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => insertFormatting('__', '__')} title="Underline">
                  <Underline className="w-4 h-4" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => insertFormatting('- ')} title="List">
                  <List className="w-4 h-4" />
                </Button>
              </div>
              <Textarea
                id="edit-description"
                ref={descriptionRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task description (optional)"
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dueDate">Due Date (Optional)</Label>
              <Input
                id="edit-dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Task</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedTasks.size > 0 && selectedTasks.size === filteredAndSortedTasks.length}
                onCheckedChange={selectAllTasks}
                aria-label="Select all tasks"
              />
              <span className="text-sm text-muted-foreground">
                {selectedTasks.size === filteredAndSortedTasks.length && filteredAndSortedTasks.length > 0
                  ? 'Deselect all'
                  : 'Select all'}
              </span>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Search tasks by title, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search tasks"
                  className="w-full"
                />
              </div>
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="completed">Completed Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Date Created</SelectItem>
                <SelectItem value="due">Due Date</SelectItem>
                <SelectItem value="title">Alphabetical</SelectItem>
              </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>      {loading ? (
        <TasksGridSkeleton />
      ) : (
        <div className="space-y-3">
          {filteredAndSortedTasks.map((task) => (
            <Card 
              key={task.id} 
              className={`shadow-card hover:shadow-card-hover transition-smooth ${
                selectedTasks.has(task.id) ? 'ring-2 ring-accent' : ''
              } ${pinnedTasks.has(task.id) ? 'border-l-4 border-l-yellow-500' : ''}`}
            >
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="flex flex-col gap-2">
                  <Checkbox
                    checked={selectedTasks.has(task.id)}
                    onCheckedChange={() => toggleTaskSelection(task.id)}
                    aria-label={`Select ${task.title}`}
                    className="mt-1"
                  />
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task.id, task.completed)}
                    aria-label={`Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {pinnedTasks.has(task.id) && (
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    )}
                    <h3 className={`font-semibold text-white ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </h3>
                    {task.due_date && new Date(task.due_date) < new Date() && !task.completed && (
                      <Badge variant="destructive" className="text-xs">Overdue</Badge>
                    )}
                  </div>
                {task.description && (
                  <div className="text-sm text-white/80 mt-1">
                    <TaskDescription content={task.description} />
                  </div>
                )}
                {task.due_date && (
                  <p className="text-xs text-white/70 mt-2">
                    Due: {new Date(task.due_date).toLocaleString()}
                  </p>
                )}

                {/* Attachments Display */}
                {attachments.filter(a => a.task_id === task.id).length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-1">
                    <p className="text-xs font-medium text-white/80">Attachments:</p>
                    <div className="space-y-1">
                      {attachments.filter(a => a.task_id === task.id).map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between text-xs p-1 bg-secondary/30 rounded">
                          <a
                            href={getFileUrl('task-attachments', attachment.storage_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-accent hover:underline truncate"
                          >
                            <span>{getFileIcon(attachment.file_type)}</span>
                            <span className="truncate">{attachment.file_name}</span>
                            <Download className="h-3 w-3" />
                          </a>
                          {user?.id === task.user_id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0"
                              onClick={() => handleDeleteAttachment(attachment.id, attachment.storage_path)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {user?.id === task.user_id && (
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => togglePin(task.id)}
                    aria-label={pinnedTasks.has(task.id) ? "Unpin task" : "Pin task"}
                    className="hover:bg-yellow-500/20 transition-colors"
                    title={pinnedTasks.has(task.id) ? "Unpin" : "Pin to top"}
                  >
                    <Star className={`h-5 w-5 ${pinnedTasks.has(task.id) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(task)}
                    aria-label="Edit Task"
                    className="hover:bg-accent/20 hover:text-accent transition-colors"
                  >
                    <Edit className="h-5 w-5 text-accent" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteTask(task.id)}
                    aria-label="Delete Task"
                  >
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
                </div>
              )}
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-accent" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {!loading && filteredAndSortedTasks.length === 0 && tasks.length > 0 && (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Filter className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tasks match your filters</p>
            <Button variant="ghost" onClick={() => { setSearchQuery(''); setFilterStatus('all'); }} className="mt-4">
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && tasks.length === 0 && (
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
