import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle } from 'lucide-react';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function AIChatFloatingDraggable() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am AI Assistant. I can access your notes, tasks, and search the web. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastSent, setLastSent] = useState<number>(0);
  const { toast } = useToast();
  const messagesEndRef = useRef(null);
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (open) setTimeout(() => scrollToBottom(), 100);
  }, [messages, open]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const now = Date.now();
    if (now - lastSent < 3000) {
      toast({
        title: 'Rate limit',
        description: 'Please wait a few seconds before sending another message.',
        variant: 'destructive',
      });
      return;
    }
    setLastSent(now);
    const userMessage = { role: 'user', content: input.trim() };
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

  // Drag logic
  const onMouseDown = (e) => {
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.userSelect = 'none';
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  };
  const onMouseUp = () => {
    setDragging(false);
    document.body.style.userSelect = '';
  };
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging]);

  return (
    <>
      <Button
        variant="secondary"
        size="icon"
        className="fixed top-4 right-4 z-50 shadow-lg"
        aria-label="Open AI Assistant"
        onClick={() => setOpen(true)}
        style={{ display: open ? 'none' : 'inline-flex' }}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
      {open && (
        <div
          className={`fixed z-50 flex flex-col transition-colors duration-300 ${typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : ''}`}
          style={{
            left: position.x,
            top: position.y,
            width: 360,
            minHeight: 440,
            maxWidth: 420,
            borderRadius: '1.25rem',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.25)',
            background: typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
              ? 'rgba(20,22,40,0.92)'
              : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(16px) saturate(180%)',
            border: typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
              ? '1.5px solid rgba(80,80,120,0.25)'
              : '1.5px solid rgba(200,200,255,0.18)',
            transition: 'box-shadow 0.2s',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-2 cursor-move select-none"
            style={{
              background: typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
                ? 'rgba(30,32,60,0.95)'
                : 'rgba(245,245,255,0.85)',
              borderTopLeftRadius: '1.25rem',
              borderTopRightRadius: '1.25rem',
              borderBottom: typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
                ? '1px solid rgba(80,80,120,0.18)'
                : '1px solid rgba(200,200,255,0.18)',
              userSelect: 'none',
              fontWeight: 600,
              fontSize: '1.08rem',
            }}
            onMouseDown={onMouseDown}
          >
            <div className="flex items-center gap-2">
              <img src="/src/gpt.png" alt="AI" className="h-8 w-8 rounded-full border-2 border-accent object-cover bg-white" style={{boxShadow:'0 1px 4px 0 rgba(0,0,0,0.10)'}} />
              <span className="font-semibold text-base" style={{lineHeight:'2.5rem'}}>AI Assistant</span>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)} className="hover:bg-red-100">
              <span className="text-2xl leading-none">×</span>
            </Button>
          </div>
          <Card className="flex-1 flex flex-col shadow-none border-none bg-transparent">
            <CardContent className="flex-1 flex flex-col min-h-0 px-0 pt-2 pb-0">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-3">
                {messages.map((msg, i) => {
                  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
                  const userBg = isDark ? 'bg-accent text-accent-foreground' : 'bg-accent text-accent-foreground';
                  const aiBg = isDark ? 'bg-[#23243a] text-white' : 'bg-white text-black';
                  return (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm transition-all ${msg.role === 'user' ? userBg : aiBg}`}
                        style={{
                          borderTopLeftRadius: msg.role === 'user' ? 18 : 8,
                          borderTopRightRadius: msg.role === 'user' ? 8 : 18,
                          borderBottomLeftRadius: msg.role === 'user' ? 18 : 8,
                          borderBottomRightRadius: msg.role === 'user' ? 8 : 18,
                          marginBottom: 2,
                          fontSize: '1rem',
                          boxShadow: msg.role === 'user' ? '0 1px 4px 0 rgba(220,220,255,0.10)' : '0 1px 4px 0 rgba(0,0,0,0.10)',
                          border: msg.role === 'user'
                            ? (isDark ? '1px solid rgba(80,80,120,0.18)' : '1px solid rgba(220,220,255,0.18)')
                            : (isDark ? '1px solid rgba(80,80,120,0.18)' : '1px solid rgba(220,220,255,0.18)'),
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.role !== 'user' && (
                            <img
                              src="/src/gpt.png"
                              alt="AI"
                              className="h-5 w-5 rounded-full border border-border"
                            />
                          )}
                          <p className="font-semibold text-sm">
                            {msg.role === 'user' ? 'You' : 'AI Assistant'}
                          </p>
                        </div>
                        <p className="text-sm whitespace-pre-line">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSend} className="flex gap-2 pb-2 px-3 items-center">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about notes or tasks..."
                  className="flex-1 rounded-full border border-border focus:ring-2 focus:ring-accent focus:border-accent px-4 py-2 text-base shadow-sm bg-white dark:bg-[#23243a] dark:text-white"
                  style={{
                    fontSize: '1rem',
                    background: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#23243a' : 'rgba(255,255,255,0.95)',
                    borderRadius: 9999,
                  }}
                  disabled={loading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={loading || !input.trim()}
                  className="rounded-full bg-accent text-accent-foreground hover:bg-accent/80 shadow-sm transition-all flex items-center justify-center"
                  style={{ minWidth: 44, minHeight: 44, padding: 0 }}
                >
                  {loading ? (
                    <span className="animate-spin">...</span>
                  ) : (
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-send"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
