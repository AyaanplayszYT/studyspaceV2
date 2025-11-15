import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Send } from 'lucide-react';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const RATE_LIMIT_MS = 3000; // 3 seconds between messages

const AIChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastSent, setLastSent] = useState<number>(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [aiLocked, setAiLocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if AI is locked and if user is admin
  useEffect(() => {
    const checkSettings = async () => {
      const { data: settings } = await supabase.from('settings').select('ai_locked').single() as any;
      if (settings) setAiLocked(settings.ai_locked);

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user?.id)
        .single() as any;
      if (profile) setIsAdmin(profile.is_admin);
    };

    checkSettings();
  }, [user]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderMessageContent = (content: string) => {
    // Check if content contains code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: (string | { type: 'code'; language: string; code: string })[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      parts.push({
        type: 'code',
        language: match[1] || 'bash',
        code: match[2].trim(),
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return (
      <div className="space-y-2">
        {parts.map((part, i) =>
          typeof part === 'string' ? (
            <p key={i} className="text-sm whitespace-pre-line">
              {part}
            </p>
          ) : (
            <pre key={i} className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto border border-slate-700">
              <code className="text-xs font-mono">{part.code}</code>
            </pre>
          )
        )}
      </div>
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Check if AI is locked
    if (aiLocked && !isAdmin) {
      toast({
        title: 'AI Locked',
        description: 'Only admins can use AI chat at this time.',
        variant: 'destructive',
      });
      return;
    }

    const now = Date.now();
    if (now - lastSent < RATE_LIMIT_MS) {
      const remainingSeconds = Math.ceil((RATE_LIMIT_MS - (now - lastSent)) / 1000);
      setCooldownSeconds(remainingSeconds);
      toast({
        title: 'Rate limit',
        description: `Please wait ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''} before sending another message.`,
        variant: 'destructive',
      });
      return;
    }
    setLastSent(now);
    setCooldownSeconds(0);
    const userMessage = { role: 'user' as const, content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_KEY}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-3.5-turbo',
          messages: [...messages, userMessage],
        }),
      });
      if (!res.ok) throw new Error('Failed to get AI response');
      const data = await res.json();
      const aiMessage = data.choices?.[0]?.message?.content || 'No response';
      setMessages((prev) => [...prev, { role: 'assistant', content: aiMessage }]);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to get AI response',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Chat</h1>
        <p className="text-muted-foreground">Running OpenAI models.</p>
      </div>
      <Card className="shadow-card h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle>AI Assistant</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-card border border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {msg.role !== 'user' && (
                      <img
                        src="/gpt.png"
                        alt="AI"
                        className="h-5 w-5 rounded-full border border-border"
                      />
                    )}
                    <p className="font-semibold text-sm">{msg.role === 'user' ? 'You' : 'AI Assistant'}</p>
                  </div>
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={aiLocked && !isAdmin ? "AI is locked" : "Ask anything..."}
              className="flex-1 text-sm md:text-base"
              disabled={loading || (aiLocked && !isAdmin)}
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || !input.trim() || cooldownSeconds > 0 || (aiLocked && !isAdmin)}
              className="px-3 md:px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all shadow-sm whitespace-nowrap"
            >
              {cooldownSeconds > 0 ? (
                <span className="text-xs md:text-sm">{cooldownSeconds}s</span>
              ) : loading ? (
                <span className="text-xs md:text-sm">Sending...</span>
              ) : (
                <Send className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIChat;

