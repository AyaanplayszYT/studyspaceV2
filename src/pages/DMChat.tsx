
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';


export default function DMChat() {
  const { user } = useAuth();
  const { userId } = useParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [friend, setFriend] = useState<{ username: string; email: string } | null>(null);
  const [error, setError] = useState('');
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
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [user, userId]);

  const fetchMessages = async () => {
    if (!user || !userId) return;
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(
        `and(from_user_id.eq.${user.id},to_user_id.eq.${userId}),and(from_user_id.eq.${userId},to_user_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await supabase.from('direct_messages').insert({
      from_user_id: user.id,
      to_user_id: userId,
      content: input.trim(),
    });
    setInput('');
  };

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>
              {friend ? friend.username : 'Direct Message'}
              {friend && (
                <span className="block text-xs font-normal text-muted-foreground">{friend.email}</span>
              )}
            </CardTitle>
            <span className="bg-yellow-200 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">Beta</span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col min-h-[400px]">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.length === 0 ? (
              <div className="flex justify-center items-center h-full text-muted-foreground">No messages yet. Say hi!</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from_user_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg p-3 ${msg.from_user_id === user.id ? 'bg-accent text-accent-foreground' : 'bg-card border border-border'}`}>
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">{new Date(msg.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSend} className="flex gap-2 mt-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." className="flex-1" />
            <Button type="submit" disabled={!input.trim()}>Send</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
