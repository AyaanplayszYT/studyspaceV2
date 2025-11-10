import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Trash2 } from 'lucide-react';
  const handleDeleteNote = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete note',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: 'Note deleted successfully',
      });
      fetchNotes();
    }
  };

interface Note {
  id: string;
  title: string;
  content: string;
  subject: string | null;
  is_public: boolean;
  created_at: string;
  profiles: {
    username: string;
  };
}

const Notes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        profiles (username)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotes(data);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('notes').insert({
      user_id: user?.id,
      title,
      content,
      subject: subject || null,
      is_public: isPublic,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create note',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Note created successfully',
      });
      setOpen(false);
      setTitle('');
      setContent('');
      setSubject('');
      setIsPublic(true);
      fetchNotes();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Study Notes</h1>
          <p className="text-muted-foreground">Share and discover study materials</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Note</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateNote} className="space-y-4">
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
                <Label htmlFor="subject">Subject (Optional)</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <Label htmlFor="public">Make this note public</Label>
              </div>
              <Button type="submit" className="w-full">Create Note</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map((note) => (
          <Card key={note.id} className="shadow-card hover:shadow-card-hover transition-smooth">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent" />
                  {note.title}
                </CardTitle>
                {note.subject && (
                  <p className="text-sm text-muted-foreground">{note.subject}</p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDeleteNote(note.id)}
                aria-label="Delete Note"
              >
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                {note.content}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>By {note.profiles.username}</span>
                <span>{note.is_public ? 'Public' : 'Private'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {notes.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notes yet. Create your first one!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Notes;
