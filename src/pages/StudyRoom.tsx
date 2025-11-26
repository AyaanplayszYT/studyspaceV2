import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Send, Users, Copy, ChevronLeft, Video, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Participant {
  id: string;
  username: string;
  user_id: string;
  is_active: boolean;
}

interface ChatMessage {
  id: string;
  username: string;
  content: string;
  created_at: string;
}

export default function StudyRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [room, setRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId || !user) return;

    const initializeRoom = async () => {
      await fetchRoom();
      await fetchParticipants();
      await fetchMessages();
      await joinRoom();
      await setupSignalingChannel();
    };

    initializeRoom();

    return () => {
      cleanup();
    };
  }, [roomId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const cleanup = () => {
    // Clean up subscriptions
    supabase.removeAllChannels();
  };

  const joinRoom = async () => {
    try {
      if (!roomId || !user) return;
      const { error } = await (supabase as any)
        .from('room_participants')
        .upsert(
          {
            room_id: roomId,
            user_id: user.id,
            is_active: true,
            left_at: null,
          },
          { onConflict: 'room_id,user_id' }
        );
      if (error) throw error;
    } catch (err) {
      console.error('Error joining room:', err);
    }
  };

  const setupSignalingChannel = async () => {
    if (!roomId || !user) return;

    const channel = supabase
      .channel(`study_room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          await fetchParticipants();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const signal: any = (payload as any).new;
          if (!signal) return;
          // Only process signals directed to me
          if (signal.to_user_id !== user.id) return;
          // Ignore our own echoes
          if (signal.from_user_id === user.id) return;

          if (signal.signal_type === 'offer') {
            await handleOffer(signal.from_user_id, signal.signal_data);
          } else if (signal.signal_type === 'answer') {
            await handleAnswer(signal.from_user_id, signal.signal_data);
          } else if (signal.signal_type === 'ice-candidate') {
            await handleIceCandidate(signal.from_user_id, signal.signal_data);
          }
        }
      )
      .subscribe();

    signalingChannelRef.current = channel;
  };

  const fetchRoom = async () => {
    try {
      const { data, error } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('id', roomId)
        .single() as any;

      if (error || !data) {
        toast({
          title: 'Error',
          description: 'Room not found',
          variant: 'destructive',
        });
        navigate('/study-rooms');
        return;
      }

      setRoom(data);
    } catch (err) {
      console.error('Error fetching room:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select('*, profiles (username)')
        .eq('room_id', roomId)
        .eq('is_active', true) as any;

      if (!error && data) {
        const participants = data.map((p: any) => ({
          id: p.id,
          username: p.profiles?.username || 'Unknown',
          user_id: p.user_id,
          is_active: p.is_active,
        }));
        setParticipants(participants);
      }
    } catch (err) {
      console.error('Error fetching participants:', err);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('room_chat_messages')
        .select('*, profiles (username)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true }) as any;

      if (!error && data) {
        const msgs = data.map((m: any) => ({
          id: m.id,
          username: m.profiles?.username || 'Unknown',
          content: m.content,
          created_at: m.created_at,
        }));
        setMessages(msgs);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      // Clean up subscriptions
      cleanup();
      
      // Delete participant record
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('user_id', user?.id)
        .eq('room_id', roomId);

      if (error) throw error;
      
      navigate('/study-rooms');
    } catch (err) {
      console.error('Error leaving room:', err);
      toast({
        title: 'Error',
        description: 'Failed to leave room',
        variant: 'destructive',
      });
      setTimeout(() => navigate('/study-rooms'), 500);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      await supabase
        .from('room_chat_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          content: newMessage.trim(),
        });

      setNewMessage('');
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const handleCopyRoomCode = () => {
    if (room?.room_code) {
      navigator.clipboard.writeText(room.room_code);
      toast({
        title: 'Copied',
        description: 'Room code copied to clipboard',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p>Loading room...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <p className="text-red-500">Room not found</p>
        <Button onClick={() => navigate('/study-rooms')}>Go back</Button>
      </div>
    );
  }

  const getGlassmorphismClasses = () => {
    return 'bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl';
  };

  return (
    <div 
      className="h-screen flex flex-col gap-4 p-4 overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('/background.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Hidden (but present) container to host remote audio elements */}
      <div className="absolute opacity-0 pointer-events-none h-0 w-0 -z-10" />
      <div className={`flex items-center justify-between p-4 ${getGlassmorphismClasses()} shadow-lg`}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/study-rooms')}
            className="hover:bg-white/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{room.room_name}</h1>
            <Badge variant="outline" className="mt-1 bg-white/10 border-white/20">{room.room_code}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyRoomCode}
            className="gap-2 bg-white/10 border-white/20 hover:bg-white/20"
          >
            <Copy className="h-4 w-4" />
            Copy Code
          </Button>
          <Button
            onClick={handleLeaveRoom}
            className="gap-2 bg-red-500/80 hover:bg-red-600/80 text-white"
          >
            Leave
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Info Section */}
        <div className="flex-1 flex flex-col gap-4">
          <Card className={`flex-1 ${getGlassmorphismClasses()} shadow-lg`}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5" />
                Video Conference
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Description</h3>
                <p className="text-base">{room.description || 'No description provided'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Max Participants</h3>
                <p className="text-base">{room.max_participants} students</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Current Participants</h3>
                <p className="text-base">{participants.length} / {room.max_participants}</p>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-muted-foreground mb-4">
                  Click the button below to join the video conference via MeetMesh
                </p>
                <Button
                  onClick={() => window.open('https://meetmesh-delta.vercel.app/', '_blank')}
                  className="w-full gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-6 text-lg"
                >
                  <Video className="h-5 w-5" />
                  Join Video Conference
                  <ExternalLink className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Sidebar */}
        <div className="w-96 flex flex-col gap-4 overflow-hidden">
          {/* Participants */}
          <div className={`${getGlassmorphismClasses()} overflow-hidden flex flex-col shadow-lg`}>
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/10">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                Participants ({participants.length})
              </h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-2 p-4">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 text-sm p-3 rounded-lg hover:bg-white/10 transition-colors bg-white/5"
                  >
                    <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="font-medium">{p.username}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Chat */}
          <div className={`flex-1 ${getGlassmorphismClasses()} overflow-hidden flex flex-col shadow-lg`}>
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/10">
              <h2 className="font-bold text-sm">Chat Messages</h2>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-xs py-8">
                    No messages yet. Start chatting!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="text-xs bg-white/5 p-3 rounded-lg border border-white/10">
                      <div className="font-semibold text-accent mb-1">{msg.username}</div>
                      <div className="text-muted-foreground break-words">{msg.content}</div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10 bg-gradient-to-t from-white/5 to-white/0 flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="text-xs h-9 bg-white/10 border-white/20 hover:bg-white/15 focus:bg-white/20 text-foreground placeholder:text-muted-foreground"
              />
              <Button
                onClick={handleSendMessage}
                size="sm"
                className="px-3 bg-accent/80 hover:bg-accent text-accent-foreground"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
