import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import {
  Pen,
  Eraser,
  Trash2,
  Download,
  Undo,
  Redo,
  Circle,
  Square,
  Minus,
  Type,
  Move,
  Users,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type Tool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'text' | 'pan';

interface DrawAction {
  id: string;
  tool: Tool;
  color: string;
  lineWidth: number;
  points: { x: number; y: number }[];
  text?: string;
  timestamp: number;
  userId: string;
  username: string;
}

interface Cursor {
  userId: string;
  username: string;
  x: number;
  y: number;
  color: string;
}

const COLORS = [
  '#000000', // Black
  '#FFFFFF', // White
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FF8800', // Orange
  '#8800FF', // Purple
];

export default function Whiteboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [redoStack, setRedoStack] = useState<DrawAction[]>([]);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [roomId, setRoomId] = useState('default-room');
  const [username, setUsername] = useState('Anonymous');
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map());
  const [showCursors, setShowCursors] = useState(true);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [whiteboardLocked, setWhiteboardLocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch username
  useEffect(() => {
    const fetchUsername = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('username, is_admin')
        .eq('id', user.id)
        .single();
      if (data) {
        setUsername(data.username);
        setIsAdmin(data.is_admin || false);
      }
    };
    fetchUsername();
  }, [user]);

  // Check if whiteboard is locked
  useEffect(() => {
    const checkSettings = async () => {
      const { data: settings } = await supabase.from('settings').select('whiteboard_locked').single() as any;
      if (settings) setWhiteboardLocked(settings.whiteboard_locked);
    };

    checkSettings();
  }, [user]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to drawing actions
    const actionsChannel = supabase
      .channel(`whiteboard:${roomId}:actions`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whiteboard_actions',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAction = payload.new as any;
            setActions((prev) => {
              // Avoid duplicates
              if (prev.some((a) => a.id === newAction.id)) return prev;
              return [...prev, {
                id: newAction.id,
                tool: newAction.tool,
                color: newAction.color,
                lineWidth: newAction.line_width,
                points: newAction.points,
                text: newAction.text,
                timestamp: new Date(newAction.created_at).getTime(),
                userId: newAction.user_id,
                username: newAction.username,
              }];
            });
          } else if (payload.eventType === 'DELETE') {
            // Handle clear all
            setActions([]);
          }
        }
      )
      .subscribe();

    // Subscribe to cursors
    const cursorsChannel = supabase
      .channel(`whiteboard:${roomId}:cursors`)
      .on('presence', { event: 'sync' }, () => {
        const state = cursorsChannel.presenceState();
        const users: string[] = [];
        const newCursors = new Map<string, Cursor>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            users.push(presence.username);
            if (presence.user_id !== user.id) {
              newCursors.set(presence.user_id, {
                userId: presence.user_id,
                username: presence.username,
                x: presence.x || 0,
                y: presence.y || 0,
                color: presence.color || '#FF0000',
              });
            }
          });
        });
        
        setConnectedUsers(users);
        setCursors(newCursors);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await cursorsChannel.track({
            user_id: user.id,
            username,
            x: 0,
            y: 0,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
          });
        }
      });

    // Load existing actions
    const loadActions = async () => {
      const { data, error } = await supabase
        .from('whiteboard_actions')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setActions(data.map((a: any) => ({
          id: a.id,
          tool: a.tool,
          color: a.color,
          lineWidth: a.line_width,
          points: a.points,
          text: a.text,
          timestamp: new Date(a.created_at).getTime(),
          userId: a.user_id,
          username: a.username,
        })));
      }
    };

    loadActions();

    return () => {
      cursorsChannel.unsubscribe();
      actionsChannel.unsubscribe();
    };
  }, [user, roomId, username]);

  // Update cursor position
  const updateCursorPosition = (x: number, y: number) => {
    if (!user) return;
    const channel = supabase.channel(`whiteboard:${roomId}:cursors`);
    channel.track({
      user_id: user.id,
      username,
      x,
      y,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  };

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply pan offset
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);

    // Draw all actions
    actions.forEach((action) => {
      if (action.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (action.tool === 'pen' || action.tool === 'eraser') {
        if (action.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(action.points[0].x, action.points[0].y);
        for (let i = 1; i < action.points.length; i++) {
          ctx.lineTo(action.points[i].x, action.points[i].y);
        }
        ctx.stroke();
      } else if (action.tool === 'rectangle') {
        if (action.points.length < 2) return;
        const start = action.points[0];
        const end = action.points[action.points.length - 1];
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (action.tool === 'circle') {
        if (action.points.length < 2) return;
        const start = action.points[0];
        const end = action.points[action.points.length - 1];
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (action.tool === 'line') {
        if (action.points.length < 2) return;
        const start = action.points[0];
        const end = action.points[action.points.length - 1];
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      } else if (action.tool === 'text' && action.text) {
        ctx.font = `${action.lineWidth * 6}px Arial`;
        ctx.fillStyle = action.color;
        ctx.fillText(action.text, action.points[0].x, action.points[0].y);
      }
    });

    ctx.restore();

    // Draw current drawing
    if (currentPoints.length > 0 && tool !== 'text') {
      ctx.save();
      ctx.translate(panOffset.x, panOffset.y);
      
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (tool === 'pen' || tool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        for (let i = 1; i < currentPoints.length; i++) {
          ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
        }
        ctx.stroke();
      } else if (tool === 'rectangle' && currentPoints.length >= 2) {
        const start = currentPoints[0];
        const end = currentPoints[currentPoints.length - 1];
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (tool === 'circle' && currentPoints.length >= 2) {
        const start = currentPoints[0];
        const end = currentPoints[currentPoints.length - 1];
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === 'line' && currentPoints.length >= 2) {
        const start = currentPoints[0];
        const end = currentPoints[currentPoints.length - 1];
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      
      ctx.restore();
    }

    // Draw cursors
    if (showCursors) {
      cursors.forEach((cursor) => {
        ctx.fillStyle = cursor.color;
        ctx.beginPath();
        ctx.arc(cursor.x + panOffset.x, cursor.y + panOffset.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.fillText(cursor.username, cursor.x + panOffset.x + 10, cursor.y + panOffset.y - 10);
      });
    }
  }, [actions, currentPoints, cursors, showCursors, tool, color, lineWidth, panOffset]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - panOffset.x,
      y: e.clientY - rect.top - panOffset.y,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Check if whiteboard is locked for non-admins
    if (whiteboardLocked && !isAdmin) {
      toast({
        title: 'Whiteboard Locked',
        description: 'Only admins can draw at this time.',
        variant: 'destructive',
      });
      return;
    }

    if (tool === 'pan') {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (tool === 'text') {
      const point = getCanvasPoint(e);
      setTextPosition(point);
      return;
    }

    setIsDrawing(true);
    const point = getCanvasPoint(e);
    setCurrentPoints([point]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - panOffset.x;
    const y = e.clientY - rect.top - panOffset.y;
    updateCursorPosition(x, y);

    if (isPanning) {
      const dx = e.clientX - lastPanPoint.x;
      const dy = e.clientY - lastPanPoint.y;
      setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!isDrawing) return;

    const point = getCanvasPoint(e);
    
    if (tool === 'pen' || tool === 'eraser') {
      setCurrentPoints((prev) => [...prev, point]);
    } else {
      setCurrentPoints((prev) => [prev[0], point]);
    }
  };

  const handleMouseUp = async () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing || currentPoints.length === 0) return;

    const newAction: DrawAction = {
      id: crypto.randomUUID(),
      tool,
      color,
      lineWidth,
      points: currentPoints,
      timestamp: Date.now(),
      userId: user?.id || '',
      username,
    };

    // Save to database
    await supabase.from('whiteboard_actions').insert({
      id: newAction.id,
      room_id: roomId,
      user_id: newAction.userId,
      username: newAction.username,
      tool: newAction.tool,
      color: newAction.color,
      line_width: newAction.lineWidth,
      points: newAction.points,
    });

    setActions((prev) => [...prev, newAction]);
    setRedoStack([]);
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim() || !textPosition) return;

    const newAction: DrawAction = {
      id: crypto.randomUUID(),
      tool: 'text',
      color,
      lineWidth,
      points: [textPosition],
      text: textInput,
      timestamp: Date.now(),
      userId: user?.id || '',
      username,
    };

    await supabase.from('whiteboard_actions').insert({
      id: newAction.id,
      room_id: roomId,
      user_id: newAction.userId,
      username: newAction.username,
      tool: newAction.tool,
      color: newAction.color,
      line_width: newAction.lineWidth,
      points: newAction.points,
      text: newAction.text,
    });

    setActions((prev) => [...prev, newAction]);
    setTextInput('');
    setTextPosition(null);
  };

  const handleUndo = async () => {
    if (actions.length === 0) return;
    const lastAction = actions[actions.length - 1];
    
    // Only allow undo of own actions
    if (lastAction.userId === user?.id) {
      await supabase.from('whiteboard_actions').delete().eq('id', lastAction.id);
      setRedoStack((prev) => [...prev, lastAction]);
      setActions((prev) => prev.slice(0, -1));
    } else {
      toast({
        title: 'Cannot undo',
        description: 'You can only undo your own actions',
        variant: 'destructive',
      });
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Clear entire whiteboard? This will delete all drawings for everyone.')) {
      await supabase.from('whiteboard_actions').delete().eq('room_id', roomId);
      setActions([]);
      setRedoStack([]);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collaborative Whiteboard</h1>
          <p className="text-muted-foreground">
            Draw together in real-time
            {whiteboardLocked && !isAdmin && (
              <span className="text-destructive ml-2">• Locked (View Only)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="text-sm">{connectedUsers.length} online</span>
        </div>
      </div>

      {/* Locked Warning */}
      {whiteboardLocked && !isAdmin && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <Lock className="h-4 w-4" />
              <p className="text-sm font-medium">
                The whiteboard is currently locked. Only admins can draw.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Tools Row 1 */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={tool === 'pen' ? 'default' : 'outline'}
                onClick={() => setTool('pen')}
                disabled={whiteboardLocked && !isAdmin}
              >
                <Pen className="h-4 w-4 mr-2" />
                Pen
              </Button>
              <Button
                size="sm"
                variant={tool === 'eraser' ? 'default' : 'outline'}
                onClick={() => setTool('eraser')}
                disabled={whiteboardLocked && !isAdmin}
              >
                <Eraser className="h-4 w-4 mr-2" />
                Eraser
              </Button>
              <Button
                size="sm"
                variant={tool === 'line' ? 'default' : 'outline'}
                onClick={() => setTool('line')}
                disabled={whiteboardLocked && !isAdmin}
              >
                <Minus className="h-4 w-4 mr-2" />
                Line
              </Button>
              <Button
                size="sm"
                variant={tool === 'rectangle' ? 'default' : 'outline'}
                onClick={() => setTool('rectangle')}
                disabled={whiteboardLocked && !isAdmin}
              >
                <Square className="h-4 w-4 mr-2" />
                Rectangle
              </Button>
              <Button
                size="sm"
                variant={tool === 'circle' ? 'default' : 'outline'}
                onClick={() => setTool('circle')}
                disabled={whiteboardLocked && !isAdmin}
              >
                <Circle className="h-4 w-4 mr-2" />
                Circle
              </Button>
              <Button
                size="sm"
                variant={tool === 'text' ? 'default' : 'outline'}
                onClick={() => setTool('text')}
                disabled={whiteboardLocked && !isAdmin}
              >
                <Type className="h-4 w-4 mr-2" />
                Text
              </Button>
              <Button
                size="sm"
                variant={tool === 'pan' ? 'default' : 'outline'}
                onClick={() => setTool('pan')}
              >
                <Move className="h-4 w-4 mr-2" />
                Pan
              </Button>

              <div className="h-6 w-px bg-border mx-2" />

              <Button size="sm" variant="outline" onClick={handleUndo}>
                <Undo className="h-4 w-4 mr-2" />
                Undo
              </Button>
              <Button size="sm" variant="outline" onClick={handleClearAll}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCursors(!showCursors)}
              >
                {showCursors ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                Cursors
              </Button>
            </div>

            {/* Tools Row 2 - Color & Width */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Color:</Label>
                <div className="flex gap-1">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      className={`w-8 h-8 rounded-full border-2 ${
                        color === c ? 'border-primary scale-110' : 'border-border'
                      } transition-transform`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                <Label>Width:</Label>
                <Slider
                  value={[lineWidth]}
                  onValueChange={(v) => setLineWidth(v[0])}
                  min={1}
                  max={50}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-8">{lineWidth}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canvas */}
      <Card className="overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1200}
          height={700}
          className="w-full border border-border cursor-crosshair bg-white"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </Card>

      {/* Text Input Dialog */}
      {textPosition && (
        <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 z-50 shadow-2xl">
          <CardContent className="space-y-3">
            <Label>Enter text:</Label>
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
              autoFocus
              placeholder="Type here..."
            />
            <div className="flex gap-2">
              <Button onClick={handleTextSubmit} className="flex-1">
                Add Text
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTextPosition(null);
                  setTextInput('');
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Users */}
      {connectedUsers.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Connected:</span>
              {connectedUsers.map((user, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                >
                  {user}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
