import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
import { Plus, FileText, Trash2, Bold, Italic, Underline, List, ChevronDown, Paperclip, X, Download, ClipboardCopy, Edit, Filter, ArrowUpDown, BookOpen, Star, Download as DownloadIcon, CheckSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { uploadFile, deleteFile, getFileUrl, formatFileSize, getFileIcon, isImageFile, getImagePreview, MAX_UPLOAD_SIZE } from '@/lib/file-upload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { NotesGridSkeleton } from '@/components/SkeletonLoaders';

// Component to render formatted text
const FormattedText = ({ text }: { text: string }) => {
  const parts: any[] = [];
  let lastIndex = 0;

  // Regex patterns for different formatting
  const patterns = [
    { regex: /\*\*([^\*]+)\*\*/g, type: 'bold' },
    { regex: /\*([^\*]+)\*/g, type: 'italic' },
    { regex: /__([^_]+)__/g, type: 'underline' },
    { regex: /`([^`]+)`/g, type: 'code' },
  ];

  // Process all patterns
  let result = text;
  result = result.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/(?<!\*)\*(?!\*)([^\*]+)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  result = result.replace(/__([^_]+)__/g, '<u>$1</u>');
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  result = result.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  result = result.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  result = result.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  result = result.replace(/^- (.*?)$/gm, '<li>$1</li>');

  return (
    <div
      className="space-y-2 break-words whitespace-normal"
      dangerouslySetInnerHTML={{
        __html: result
          .split('\n')
          .map((line) => {
            // Preserve empty lines with a non-breaking space
            if (line.trim() === '') return `<div class="text-white font-semibold my-1 break-words h-4">&nbsp;</div>`;
            if (line.includes('<h1>')) return `<div class="text-white font-bold text-lg mt-4 mb-2 break-words">${line.replace(/<h1>(.*?)<\/h1>/, '$1')}</div>`;
            if (line.includes('<h2>')) return `<div class="text-white font-bold text-base mt-4 mb-2 break-words">${line.replace(/<h2>(.*?)<\/h2>/, '$1')}</div>`;
            if (line.includes('<h3>')) return `<div class="text-white font-bold text-sm mt-3 mb-1 break-words">${line.replace(/<h3>(.*?)<\/h3>/, '$1')}</div>`;
            if (line.includes('<li>')) return `<div class="text-white font-semibold my-1 ml-4 break-words">• ${line.replace(/<li>(.*?)<\/li>/, '$1')}</div>`;
            return `<div class="text-white font-semibold my-2 break-words">${line}</div>`;
          })
          .join('')
          .replace(/<strong>(.*?)<\/strong>/g, '<span class="font-bold text-white break-words">$1</span>')
          .replace(/<em>(.*?)<\/em>/g, '<span class="italic text-white break-words">$1</span>')
          .replace(/<u>(.*?)<\/u>/g, '<span class="underline text-white break-words">$1</span>')
          .replace(/<code>(.*?)<\/code>/g, '<span class="bg-slate-700 text-white px-1.5 py-0.5 rounded text-xs break-words">$1</span>'),
      }}
    />
  );
};

// Custom markdown components to handle formatting
const markdownComponents = {
  strong: ({ children }: any) => <strong className="font-bold text-white">{children}</strong>,
  em: ({ children }: any) => <em className="italic text-white">{children}</em>,
  code: ({ children }: any) => <code className="bg-slate-700 text-white px-1.5 py-0.5 rounded text-xs">{children}</code>,
  p: ({ children }: any) => <p className="text-white font-semibold my-2">{children}</p>,
  li: ({ children }: any) => <li className="text-white font-semibold my-1 ml-4">• {children}</li>,
  h1: ({ children }: any) => <h1 className="text-white font-bold text-lg mt-4 mb-2">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-white font-bold text-base mt-4 mb-2">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-white font-bold text-sm mt-3 mb-1">{children}</h3>,
  blockquote: ({ children }: any) => <blockquote className="border-l-4 border-white pl-4 text-white italic my-2">{children}</blockquote>,
  hr: () => <hr className="border-slate-600 my-3" />,
};

interface Note {
  id: string;
  title: string;
  content: string;
  subject: string | null;
  is_public: boolean;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
  };
}

interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  created_at: string;
}

const Notes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  // Create form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [notesLocked, setNotesLocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ [key: string]: string }>({});
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'my' | 'public'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'title' | 'subject'>('created');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [pinnedNotes, setPinnedNotes] = useState<Set<string>>(new Set());
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoized filtered and sorted notes
  const filteredAndSortedNotes = useMemo(() => {
    let filtered = notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.subject?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = filterBy === 'all' ? true :
        filterBy === 'my' ? note.user_id === user?.id :
        note.is_public;
      
      const matchesSubject = selectedSubject === 'all' || note.subject === selectedSubject;
      
      return matchesSearch && matchesFilter && matchesSubject;
    });

    filtered.sort((a, b) => {
      // Pinned notes always come first
      const aPinned = pinnedNotes.has(a.id);
      const bPinned = pinnedNotes.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      // Then apply regular sorting
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'subject') {
        return (a.subject || '').localeCompare(b.subject || '');
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [notes, searchQuery, filterBy, sortBy, selectedSubject, user?.id, pinnedNotes]);

  // Get unique subjects for filter
  const uniqueSubjects = useMemo(() => {
    const subjects = notes
      .map(n => n.subject)
      .filter((s): s is string => s !== null && s !== '');
    return ['all', ...Array.from(new Set(subjects))];
  }, [notes]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = notes.length;
    const myNotes = notes.filter(n => n.user_id === user?.id).length;
    const publicNotes = notes.filter(n => n.is_public).length;
    const subjects = uniqueSubjects.length - 1; // Exclude 'all'
    
    return { total, myNotes, publicNotes, subjects };
  }, [notes, uniqueSubjects, user?.id]);

  // Check if notes are locked and if user is admin
  useEffect(() => {
    const checkSettings = async () => {
      const { data: settings } = await supabase.from('settings').select('notes_locked').single() as any;
      if (settings) setNotesLocked(settings.notes_locked);

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user?.id)
        .single() as any;
      if (profile) setIsAdmin(profile.is_admin);
    };

    checkSettings();
  }, [user]);

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

  // Bulk actions for notes
  const toggleNoteSelection = (noteId: string) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId);
    } else {
      newSelected.add(noteId);
    }
    setSelectedNotes(newSelected);
  };

  const selectAllNotes = () => {
    if (selectedNotes.size === filteredAndSortedNotes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(filteredAndSortedNotes.map(n => n.id)));
    }
  };

  const bulkDeleteNotes = async () => {
    if (selectedNotes.size === 0) return;
    
    const { error } = await supabase
      .from('notes')
      .delete()
      .in('id', Array.from(selectedNotes));
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete notes',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `${selectedNotes.size} note(s) deleted successfully`,
      });
      setSelectedNotes(new Set());
      fetchNotes();
    }
  };

  // Pin/Unpin notes
  const togglePinNote = (noteId: string) => {
    const newPinned = new Set(pinnedNotes);
    if (newPinned.has(noteId)) {
      newPinned.delete(noteId);
      toast({ title: 'Note unpinned' });
    } else {
      newPinned.add(noteId);
      toast({ title: 'Note pinned to top' });
    }
    setPinnedNotes(newPinned);
    localStorage.setItem('pinnedNotes', JSON.stringify(Array.from(newPinned)));
  };

  // Export functionality
  const exportNotesToMarkdown = () => {
    let markdown = '# My Study Notes\n\n';
    markdown += `Generated on ${new Date().toLocaleDateString()}\n\n`;
    
    filteredAndSortedNotes.forEach(note => {
      markdown += `## ${note.title}\n\n`;
      if (note.subject) {
        markdown += `**Subject:** ${note.subject}\n\n`;
      }
      markdown += `${note.content}\n\n`;
      markdown += `*By ${note.profiles.username} - ${note.is_public ? 'Public' : 'Private'}*\n\n`;
      markdown += '---\n\n';
    });
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exported!',
      description: 'Notes exported as Markdown file',
    });
  };

  const exportNotesToJSON = () => {
    const data = {
      exported: new Date().toISOString(),
      notes: filteredAndSortedNotes.map(n => ({
        title: n.title,
        content: n.content,
        subject: n.subject,
        is_public: n.is_public,
        author: n.profiles.username,
        created_at: n.created_at,
      })),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exported!',
      description: 'Notes exported as JSON file',
    });
  };

  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditSubject(note.subject || '');
    setEditIsPublic(note.is_public);
    setEditOpen(true);
    setSelectedNote(null);
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editTitle.trim() || !editContent.trim()) {
      toast({
        title: 'Error',
        description: 'Title and content are required',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('notes')
      .update({
        title: editTitle.trim(),
        content: editContent.trim(),
        subject: editSubject.trim() || null,
        is_public: editIsPublic,
      })
      .eq('id', editingNote.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update note',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Note updated successfully',
      });
      setEditOpen(false);
      setEditTitle('');
      setEditContent('');
      setEditSubject('');
      setEditIsPublic(true);
      setEditingNote(null);
      fetchNotes();
    }
  };

  // Formatting functions
  const insertFormatting = (before: string, after: string = '') => {
    if (!contentRef.current) return;
    const start = contentRef.current.selectionStart;
    const end = contentRef.current.selectionEnd;
    const selectedText = content.substring(start, end) || 'text';
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newContent);
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

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Copied',
        description: 'File link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy link',
        variant: 'destructive',
      });
    }
  };

  const uploadAttachments = async (noteId: string) => {
    if (selectedAttachments.length === 0) return;
    
    setUploading(true);
    try {
      for (const file of selectedAttachments) {
        const result = await uploadFile(file, 'note-attachments', user?.id || '');
        
        if (result.success && result.path) {
          // Save attachment metadata to database
          const { error } = await supabase.from('note_attachments').insert({
            note_id: noteId,
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
      await fetchNoteAttachments(noteId);
      
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

  const fetchNoteAttachments = async (noteId: string) => {
    const { data, error } = await supabase
      .from('note_attachments')
      .select('*')
      .eq('note_id', noteId);

    if (!error && data) {
      setAttachments(data);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, storagePath: string) => {
    try {
      // Delete from storage
      const result = await deleteFile('note-attachments', storagePath);
      
      if (result.success) {
        // Delete from database
        const { error } = await supabase
          .from('note_attachments')
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
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const target = event.target as HTMLElement;
      const isEditable = target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName);
      if (isEditable) return;
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        if (!notesLocked || isAdmin) {
          setOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [notesLocked, isAdmin]);

  useEffect(() => {
    fetchNotes();
  }, [user]);

  useEffect(() => {
    if (selectedNote) {
      fetchNoteAttachments(selectedNote.id);
    }
  }, [selectedNote]);

  // Load pinned notes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pinnedNotes');
    if (saved) {
      setPinnedNotes(new Set(JSON.parse(saved)));
    }
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if notes are locked
    if (notesLocked && !isAdmin) {
      toast({
        title: 'Notes Locked',
        description: 'Only admins can create notes at this time.',
        variant: 'destructive',
      });
      return;
    }

    const { data, error } = await supabase.from('notes').insert({
      user_id: user?.id,
      title,
      content,
      subject: subject || null,
      is_public: isPublic,
    }).select().single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create note',
        variant: 'destructive',
      });
    } else {
      // Upload attachments if any
      if (selectedAttachments.length > 0) {
        await uploadAttachments(data.id);
      }

      toast({
        title: 'Success',
        description: 'Note created successfully',
      });
      setOpen(false);
      setTitle('');
      setContent('');
      setSubject('');
      setIsPublic(true);
      setSelectedAttachments([]);
      setFilePreviews({});
      fetchNotes();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Study Notes</h1>
          <p className="text-muted-foreground">Share and discover study materials</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedNotes.size > 0 && (
            <>
              <Badge variant="secondary" className="px-3 py-1">
                {selectedNotes.size} selected
              </Badge>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={bulkDeleteNotes}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          )}
          <Select onValueChange={(value) => value === 'markdown' ? exportNotesToMarkdown() : exportNotesToJSON()}>
            <SelectTrigger className="w-[140px]">
              <DownloadIcon className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="markdown">Markdown</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={notesLocked && !isAdmin} title={notesLocked && !isAdmin ? 'Notes are locked - only admins can create' : ''}>
                <Plus className="h-4 w-4" />
                Create Note
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Create Note Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
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
                  <Button type="button" size="sm" variant="outline" onClick={() => insertFormatting('## ', '')} title="Subheading">
                    H2
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => insertFormatting('`', '`')} title="Code">
                    &lt;/&gt;
                  </Button>
                </div>
                <Textarea
                  ref={contentRef}
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  required
                  placeholder="Use formatting buttons above or type markdown..."
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
                      {selectedAttachments.map((file, idx) => {
                        const progressPercent = Math.min(100, Math.round((file.size / MAX_UPLOAD_SIZE) * 100));
                        return (
                          <div key={idx} className="relative group">
                            {filePreviews[file.name] ? (
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
                                <div className="mt-1 h-1 w-full rounded-full bg-muted-foreground/20 overflow-hidden">
                                  <div
                                    className="h-full bg-accent"
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
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
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? 'Creating & Uploading...' : 'Create Note'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingNote(null);
          setEditTitle('');
          setEditContent('');
          setEditSubject('');
          setEditIsPublic(true);
        }
        setEditOpen(open);
      }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateNote} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Note title"
              />
            </div>

            <div>
              <Label htmlFor="edit-subject">Subject</Label>
              <Input
                id="edit-subject"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="Subject (optional)"
              />
            </div>

            <div>
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Note content"
                className="min-h-[300px] resize-none"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="edit-public" checked={editIsPublic} onCheckedChange={setEditIsPublic} />
                <Label htmlFor="edit-public" className="cursor-pointer">
                  {editIsPublic ? 'Public' : 'Private'}
                </Label>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Note</Button>
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
                checked={selectedNotes.size > 0 && selectedNotes.size === filteredAndSortedNotes.length}
                onCheckedChange={selectAllNotes}
                aria-label="Select all notes"
              />
              <span className="text-sm text-muted-foreground">
                {selectedNotes.size === filteredAndSortedNotes.length && filteredAndSortedNotes.length > 0
                  ? 'Deselect all'
                  : 'Select all'}
              </span>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Search notes by title, subject, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search notes"
                  className="w-full"
                />
              </div>
              <Select value={filterBy} onValueChange={(v: any) => setFilterBy(v)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Notes</SelectItem>
                  <SelectItem value="my">My Notes</SelectItem>
                  <SelectItem value="public">Public Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <BookOpen className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSubjects.map(subj => (
                    <SelectItem key={subj} value={subj}>
                      {subj === 'all' ? 'All Subjects' : subj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Date Created</SelectItem>
                  <SelectItem value="title">Alphabetical</SelectItem>
                  <SelectItem value="subject">By Subject</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <NotesGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-full">
          {filteredAndSortedNotes.map((note) => (
            <Card 
              key={note.id} 
              className={`shadow-card hover:shadow-card-hover transition-smooth cursor-pointer group overflow-hidden max-w-full ${
                selectedNotes.has(note.id) ? 'ring-2 ring-accent' : ''
              } ${pinnedNotes.has(note.id) ? 'border-t-4 border-t-yellow-500' : ''}`}
              onClick={() => !selectedNotes.has(note.id) && setSelectedNote(note)}
            >
              <CardHeader className="flex flex-col items-start justify-start gap-2 w-full overflow-hidden">
                <div className="flex flex-row items-start justify-between gap-2 w-full overflow-hidden">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Checkbox
                      checked={selectedNotes.has(note.id)}
                      onCheckedChange={() => toggleNoteSelection(note.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${note.title}`}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2">
                        {pinnedNotes.has(note.id) && (
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 flex-shrink-0" />
                        )}
                        <FileText className="h-5 w-5 text-accent flex-shrink-0" />
                        <span className="break-words">{note.title}</span>
                      </CardTitle>
                      {note.subject && (
                        <Badge variant="outline" className="mt-1 text-xs">{note.subject}</Badge>
                      )}
                    </div>
                  </div>
                  {user?.id === note.user_id && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.preventDefault();
                          e.stopPropagation();
                          togglePinNote(note.id);
                        }}
                        aria-label={pinnedNotes.has(note.id) ? "Unpin note" : "Pin note"}
                        className="hover:bg-yellow-500/20 transition-colors"
                        title={pinnedNotes.has(note.id) ? "Unpin" : "Pin to top"}
                      >
                        <Star className={`h-4 w-4 ${pinnedNotes.has(note.id) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openEditDialog(note);
                        }}
                        aria-label="Edit Note"
                        className="hover:bg-accent/20 hover:text-accent transition-colors"
                      >
                        <Edit className="h-5 w-5 text-accent" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                      aria-label="Delete Note"
                    >
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-white line-clamp-4 max-w-none break-words">
                <FormattedText text={note.content} />
              </div>
              <div className="flex items-center justify-between text-xs text-white pt-2 border-t">
                <span>By {note.profiles.username}</span>
                <span>{note.is_public ? 'Public' : 'Private'}</span>
              </div>
              <div className="flex items-center justify-center gap-1 text-xs font-semibold text-white group-hover:text-white transition-colors pt-1">
                <ChevronDown className="h-3 w-3" />
                <span>Click to view more context</span>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {!loading && filteredAndSortedNotes.length === 0 && notes.length > 0 && (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Filter className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notes match your filters</p>
            <Button 
              variant="ghost" 
              onClick={() => { 
                setSearchQuery(''); 
                setFilterBy('all'); 
                setSelectedSubject('all'); 
              }} 
              className="mt-4"
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && notes.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notes yet. Create your first one!</p>
          </CardContent>
        </Card>
      )}

      {/* Detail View Dialog */}
      <Dialog open={selectedNote !== null} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedNote && (
            <>
              <DialogHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div className="flex-1">
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <FileText className="h-6 w-6 text-accent" />
                    {selectedNote.title}
                  </DialogTitle>
                  {selectedNote.subject && (
                    <p className="text-sm text-muted-foreground mt-2 break-words">{selectedNote.subject}</p>
                  )}
                </div>
                {user?.id === selectedNote.user_id && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      handleDeleteNote(selectedNote.id);
                      setSelectedNote(null);
                    }}
                    aria-label="Delete Note"
                  >
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
                )}
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="max-w-none break-words">
                  <FormattedText text={selectedNote.content} />
                </div>

                {/* Attachments Section */}
                {attachments.length > 0 && (
                  <div className="space-y-2 p-4 bg-secondary/20 rounded-lg border border-border">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Attachments ({attachments.length})
                    </h4>
                    <div className="space-y-2">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded text-sm">
                          <a
                            href={getFileUrl('note-attachments', attachment.storage_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 hover:text-accent transition-colors flex-1"
                          >
                            <span className="text-lg">{getFileIcon(attachment.file_type)}</span>
                            <span className="truncate">{attachment.file_name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">({formatFileSize(attachment.file_size)})</span>
                          </a>
                          {user?.id === selectedNote.user_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAttachment(attachment.id, attachment.storage_path)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
                  <span>By {selectedNote.profiles.username}</span>
                  <span>{selectedNote.is_public ? 'Public' : 'Private'}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
