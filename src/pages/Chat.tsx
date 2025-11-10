import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Send, Trash2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
  };
  user_id: string;
}

const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles (username)
      `)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { error } = await supabase.from('chat_messages').insert({
      user_id: user?.id,
      content: newMessage.trim(),
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } else {
      setNewMessage('');
    }
  };

  // Delete message handler
  const handleDeleteMessage = async (id: string) => {
    const { error } = await supabase.from('chat_messages').delete().eq('id', id);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
    } else {
      fetchMessages();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">General Chat</h1>
        <p className="text-muted-foreground">Connect with your study community</p>
      </div>

      <Card className="shadow-card h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle>Live Chat</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`relative max-w-[70%] rounded-lg p-3 ${
                    message.user_id === user?.id
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-card border border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{message.profiles.username}</p>
                    {message.user_id === user?.id && (
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        aria-label="Delete Message"
                        className="ml-1 p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
                        style={{ lineHeight: 0 }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full bg-accent text-accent-foreground hover:bg-accent/80 shadow-sm transition-all flex items-center justify-center"
              style={{ minWidth: 44, minHeight: 44, padding: 0 }}
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Chat;
