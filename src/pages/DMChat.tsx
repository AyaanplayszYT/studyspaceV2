
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, LogOut, Trash2, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


export default function DMChat() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [friend, setFriend] = useState<{ username: string; email: string } | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch friend's profile
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('username, email')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setError('User not found');
        else setFriend(data);
      });
  }, [userId]);

  useEffect(() => {
    if (!user || !userId) return;
    fetchMessages();
    
    // Subscribe to new DMs
    const channel = supabase
      .channel('direct_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        if (
          (payload.new.from_user_id === user.id && payload.new.to_user_id === userId) ||
          (payload.new.from_user_id === userId && payload.new.to_user_id === user.id)
        ) {
          fetchMessages();
          // Mark incoming messages as read
          if (payload.new.to_user_id === user.id && payload.new.from_user_id === userId) {
            markMessagesAsRead(userId);
          }
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
    // eslint-disable-next-line
  }, [user, userId]);

  const fetchMessages = async () => {
    if (!user || !userId) return;
    try {
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(from_user_id.eq.${user.id},to_user_id.eq.${userId}),and(from_user_id.eq.${userId},to_user_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });
      
      setMessages(data || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      
      // Mark messages as read
      if (data && data.length > 0) {
        markMessagesAsRead(userId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markMessagesAsRead = async (fromUserId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('direct_messages')
        .update({ read: true })
        .eq('from_user_id', fromUserId)
        .eq('to_user_id', user.id);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !userId) return;
    
    try {
      setSending(true);
      const { error } = await supabase.from('direct_messages').insert({
        from_user_id: user.id,
        to_user_id: userId,
        content: input.trim(),
      });

      if (error) throw error;
      setInput('');
      await fetchMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('direct_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleRemoveFriend = async () => {
    if (!user || !userId) return;
    try {
      await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`);
      
      navigate('/dms');
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => navigate('/dms')}>Back to Messages</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 h-[calc(100vh-200px)] flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/dms')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>
                  {friend ? friend.username : 'Direct Message'}
                </CardTitle>
                {friend && (
                  <p className="text-sm text-muted-foreground">{friend.email}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" title="Remove Friend">
                    <AlertCircle className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Friend</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove {friend?.username} from your friends? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-2">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemoveFriend} className="bg-destructive hover:bg-destructive/90">
                      Remove Friend
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
              <Button 
                onClick={signOut} 
                variant="outline" 
                size="icon"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col min-h-[500px] flex-1">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 py-4 min-h-0">
            {messages.length === 0 ? (
              <div className="flex justify-center items-center h-full text-muted-foreground">
                <p>No messages yet. Say hi! 👋</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from_user_id === user?.id ? 'justify-end' : 'justify-start'} group`}>
                  <div className={`max-w-[70%] rounded-lg p-3 ${msg.from_user_id === user?.id ? 'bg-blue-600 text-white' : 'bg-muted'}`}>
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className={`text-xs opacity-70 ${msg.from_user_id === user?.id ? 'text-blue-100' : ''}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {msg.from_user_id === user?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Message</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this message? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="flex gap-2">
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteMessage(msg.id)} className="bg-destructive hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSend} className="flex gap-2 mt-auto pt-4 border-t">
            <textarea 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as any);
                }
              }}
              placeholder="Type a message... (Shift+Enter for new line)" 
              className="flex-1 bg-background border border-input rounded-md px-3 py-2 text-sm resize-none max-h-24 focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={sending}
              autoFocus
              rows={3}
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || sending}
              size="icon"
              className="flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
