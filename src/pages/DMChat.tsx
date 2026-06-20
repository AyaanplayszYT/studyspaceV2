import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Trash2, AlertCircle, Smile, Paperclip, MoreVertical, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
  const [friend, setFriend] = useState<{ username: string; email: string; avatar_url: string | null } | null>(null);
  const [currentUser, setCurrentUser] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch friend's profile
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('username, email, avatar_url')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setError('User not found');
        else setFriend(data);
      });
  }, [userId]);

  // Fetch current user's profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setCurrentUser(data);
      });
  }, [user]);

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
      textareaRef.current?.focus();
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
    <div className="container max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col p-4">
      <Card className="flex-1 flex flex-col overflow-hidden shadow-lg">
        {/* Header */}
        <CardHeader className="border-b bg-card/50 backdrop-blur-sm px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/dms')}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <Avatar className="w-11 h-11 border-2 border-border flex-shrink-0">
                <AvatarImage src={friend?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {friend?.username.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <button
                  onClick={() => navigate(`/profile/${userId}`)}
                  className="hover:underline text-left w-full"
                >
                  <h2 className="font-semibold text-lg truncate hover:text-primary transition-colors">
                    {friend?.username || 'Loading...'}
                  </h2>
                </button>
                {friend && (
                  <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/profile/${userId}`)}>
                  <User className="h-4 w-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Remove Friend
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Friend?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove <span className="font-semibold">{friend?.username}</span> from your friends? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-2 justify-end">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRemoveFriend} className="bg-destructive hover:bg-destructive/90">
                        Remove Friend
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
          {messages.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-center">
              <div className="bg-primary/10 rounded-full p-6 mb-4">
                <Smile className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
              <p className="text-muted-foreground mb-4">Start the conversation with {friend?.username}! 👋</p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => {
                const isOwn = msg.from_user_id === user?.id;
                const showAvatar = idx === 0 || messages[idx - 1].from_user_id !== msg.from_user_id;
                const showTimestamp = idx === messages.length - 1 || messages[idx + 1].from_user_id !== msg.from_user_id;
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {showAvatar ? (
                      <Avatar className="w-8 h-8 flex-shrink-0 border border-border">
                        <AvatarImage src={isOwn ? currentUser?.avatar_url || undefined : friend?.avatar_url || undefined} />
                        <AvatarFallback className={isOwn ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'}>
                          {isOwn 
                            ? currentUser?.username.charAt(0).toUpperCase() || 'Y'
                            : friend?.username.charAt(0).toUpperCase() || 'F'
                          }
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8" />
                    )}
                    
                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
                      <div className="group relative flex items-end gap-1">
                        {isOwn && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Message?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This message will be permanently deleted. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="flex gap-2 justify-end">
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMessage(msg.id)} className="bg-destructive hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <div className={`rounded-2xl px-4 py-2 shadow-sm ${
                          isOwn 
                            ? 'bg-primary text-primary-foreground rounded-br-sm' 
                            : 'bg-card border border-border rounded-bl-sm'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                      </div>
                      {showTimestamp && (
                        <span className={`text-xs text-muted-foreground mt-1 px-2 ${isOwn ? 'text-right' : 'text-left'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {msg.read && isOwn && <span className="ml-1">· Read</span>}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>

        {/* Input Area */}
        <div className="border-t bg-card/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSend} className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea 
                ref={textareaRef}
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e as any);
                  }
                }}
                placeholder="Type a message... (Shift+Enter for new line)" 
                className="w-full bg-background border border-input rounded-2xl px-4 py-3 pr-12 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all max-h-32 min-h-[44px]"
                disabled={sending}
                autoFocus
                rows={1}
                style={{
                  height: 'auto',
                  minHeight: '44px',
                  maxHeight: '128px'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                }}
              />
            </div>
            <Button 
              type="submit" 
              disabled={!input.trim() || sending}
              size="icon"
              className="h-11 w-11 rounded-full flex-shrink-0 shadow-lg hover:shadow-xl transition-all"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
