import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { Button } from '@/components/ui/button';
import { X, Send, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const RATE_LIMIT_MS = 3000; // 3 seconds between messages

const GREETINGS = [
  'Hi there! I\'m your AI study buddy. Ready to help with anything?',
  'Welcome to your AI assistant! Ask me anything about your studies.',
  'Hey! I\'m here to help you learn and stay organized. What do you need?'
];

let greetingIndex = 0;

export function AIChatFloatingDraggable() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: GREETINGS[greetingIndex++ % GREETINGS.length] }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastSent, setLastSent] = useState<number>(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const { toast } = useToast();
  const messagesEndRef = useRef(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 400, y: 40 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (open) setTimeout(() => scrollToBottom(), 100);
  }, [messages, open]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
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
        className="fixed top-6 right-6 z-40 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
        aria-label="Open AI Assistant"
        onClick={() => setOpen(true)}
        style={{ display: open ? 'none' : 'inline-flex' }}
      >
        <Sparkles className="w-5 h-5" />
      </Button>
      {open && (
        <div
          className="fixed z-50 flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-2xl"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: 360,
            height: 500,
            maxWidth: 'calc(100vw - 20px)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 cursor-move select-none border-b border-white/10 flex-shrink-0 bg-white/5"
            onMouseDown={onMouseDown}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white text-sm">AI Study Assistant</span>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setOpen(false)} 
              className="hover:bg-white/10 text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-3 p-4 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-white/10 text-white rounded-bl-none border border-white/20'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words markdown-body">
                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-white rounded-2xl rounded-bl-none border border-white/20 px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-white/10 p-3 flex-shrink-0 bg-white/5">
            <form onSubmit={handleSend} className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e as any);
                  }
                }}
                placeholder="Ask me anything... (Shift+Enter for new line)"
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/40 rounded-lg p-2 resize-none max-h-20 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                rows={2}
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !input.trim() || cooldownSeconds > 0}
                className="flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all"
                title={cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : 'Send message'}
              >
                {cooldownSeconds > 0 ? (
                  <span className="text-xs font-semibold">{cooldownSeconds}</span>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
