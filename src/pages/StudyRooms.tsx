import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Video, Users, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StudyRoom {
  id: string;
  room_code: string;
  room_name: string;
  description: string;
  created_by: string;
  max_participants: number;
  created_at: string;
  profiles: {
    username: string;
  };
  room_participants: Array<{ id: string }>;
}

export default function StudyRooms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    // Fetch locked status from settings table
    const fetchLocked = async () => {
      const { data, error } = await supabase.from('settings').select('study_rooms_locked').single();
      if (!error && data) {
        setLocked(data.study_rooms_locked);
      } else {
        // Default to unlocked if there's an error
        setLocked(false);
      }
    };
    fetchLocked();

    // Subscribe to settings changes
    const subscription = supabase
      .channel('settings_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'settings' },
        (payload) => {
          if (payload.new.study_rooms_locked !== undefined) {
            setLocked(payload.new.study_rooms_locked);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    fetchRooms();
    const subscription = supabase
      .channel('study_rooms_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_rooms' }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('study_rooms')
        .select(`
          *,
          profiles:created_by (username),
          room_participants (id)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false }) as any;

      if (!error && data) {
        setRooms(data);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = async () => {
    if (locked) {
      toast({
        title: 'Error',
        description: 'Study rooms are currently locked by admin',
        variant: 'destructive',
      });
      return;
    }

    if (!user || !roomName.trim()) {
      toast({
        title: 'Error',
        description: 'Room name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const roomCode = generateRoomCode();
      const { data, error } = await supabase
        .from('study_rooms')
        .insert({
          room_code: roomCode,
          created_by: user.id,
          room_name: roomName.trim(),
          description: description.trim(),
          max_participants: maxParticipants,
        })
        .select()
        .single() as any;

      if (error) throw error;

      // Automatically join the room
      await supabase
        .from('room_participants')
        .insert({
          room_id: data.id,
          user_id: user.id,
        });

      toast({
        title: 'Success',
        description: 'Study room created! Room code: ' + roomCode,
      });

      setRoomName('');
      setDescription('');
      setMaxParticipants(10);
      await fetchRooms();
      navigate(`/study-room/${data.id}`);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create room',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (locked) {
      toast({
        title: 'Error',
        description: 'Study rooms are currently locked by admin',
        variant: 'destructive',
      });
      return;
    }

    if (!user || !joinCode.trim()) {
      toast({
        title: 'Error',
        description: 'Room code is required',
        variant: 'destructive',
      });
      return;
    }

    setIsJoining(true);
    try {
      const { data: room, error: fetchError } = await supabase
        .from('study_rooms')
        .select('id, max_participants, room_participants (id)')
        .eq('room_code', joinCode.toUpperCase())
        .eq('is_active', true)
        .single() as any;

      if (fetchError || !room) {
        toast({
          title: 'Error',
          description: 'Room not found',
          variant: 'destructive',
        });
        return;
      }

      if (room.room_participants.length >= room.max_participants) {
        toast({
          title: 'Error',
          description: 'Room is full',
          variant: 'destructive',
        });
        return;
      }

      await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
        });

      toast({
        title: 'Success',
        description: 'Joined room successfully!',
      });

      setJoinCode('');
      navigate(`/study-room/${room.id}`);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to join room',
        variant: 'destructive',
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinFromCard = async (roomId: string) => {
    if (locked) {
      toast({
        title: 'Error',
        description: 'Study rooms are currently locked by admin',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    try {
      await supabase
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: user.id,
        });

      navigate(`/study-room/${roomId}`);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to join room',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Study Rooms
            <span className="px-2 py-1 rounded bg-yellow-400 text-xs font-bold text-black">BETA</span>
            {locked && <span className="px-2 py-1 rounded bg-red-500 text-xs font-bold text-white">Locked</span>}
          </h1>
          <p className="text-muted-foreground">Connect with others in collaborative study sessions</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={locked}>
                <Plus className="h-4 w-4" />
                Create Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Study Room</DialogTitle>
                <DialogDescription>Start a new study room and invite others to join</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="room-name">Room Name</Label>
                  <Input
                    id="room-name"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="e.g., Math Study Group"
                    disabled={locked}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What will you be studying?"
                    rows={3}
                    disabled={locked}
                  />
                </div>
                <div>
                  <Label htmlFor="max-participants">Max Participants</Label>
                  <Input
                    id="max-participants"
                    type="number"
                    min="2"
                    max="50"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                    disabled={locked}
                  />
                </div>
                <Button onClick={handleCreateRoom} disabled={isCreating || locked} className="w-full">
                  {isCreating ? 'Creating...' : 'Create Room'}
                </Button>
                {locked && <div className="text-center text-red-500 text-xs mt-2">Study rooms are currently locked for beta testing.</div>}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={locked}>
                <LogOut className="h-4 w-4" />
                Join with Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Study Room</DialogTitle>
                <DialogDescription>Enter the room code to join an existing study session</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="join-code">Room Code</Label>
                  <Input
                    id="join-code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g., ABC123"
                    maxLength={6}
                    disabled={locked}
                  />
                </div>
                <Button onClick={handleJoinRoom} disabled={isJoining || locked} className="w-full">
                  {isJoining ? 'Joining...' : 'Join Room'}
                </Button>
                {locked && <div className="text-center text-red-500 text-xs mt-2">Joining rooms is currently locked for beta testing.</div>}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">Loading rooms...</div>
      ) : rooms.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No active study rooms</h3>
            <p className="text-muted-foreground mb-4">Create one or join using a room code!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map((room) => (
            <Card key={room.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      {room.room_name}
                    </CardTitle>
                    <CardDescription>by {room.profiles?.username}</CardDescription>
                  </div>
                  <Badge variant="outline">{room.room_code}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {room.description && (
                  <p className="text-sm text-muted-foreground">{room.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>{room.room_participants.length} / {room.max_participants}</span>
                  </div>
                  <Button
                    onClick={() => handleJoinFromCard(room.id)}
                    disabled={room.room_participants.length >= room.max_participants || locked}
                    size="sm"
                    title={locked ? 'Study rooms are locked' : ''}
                  >
                    Join
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
