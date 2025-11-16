import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useThemeManager } from '@/hooks/use-theme-manager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Phone, Send, Users, Copy, ChevronLeft, Mic, MicOff } from 'lucide-react';
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
  const { currentTheme } = useThemeManager();

  const [room, setRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const signalingChannelRef = useRef<any>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const isInitializedRef = useRef(false);
  const hasLeftRef = useRef(false);

  // Optimized ICE servers and optional TURN from env for reliability
  const rtcConfiguration: RTCConfiguration = (() => {
    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];
    const turnUrl = (import.meta as any)?.env?.VITE_TURN_URL;
    const turnUsername = (import.meta as any)?.env?.VITE_TURN_USERNAME;
    const turnCredential = (import.meta as any)?.env?.VITE_TURN_CREDENTIAL;
    if (turnUrl && turnUsername && turnCredential) {
      iceServers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential });
    }
    return {
      iceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    } as RTCConfiguration;
  })();

  useEffect(() => {
    if (!roomId || !user) return;

    const initializeRoom = async () => {
      await fetchRoom();
      await fetchParticipants();
      await fetchMessages();
      await initializeLocalStream();
      await joinRoom();
      await setupSignalingChannel();
      isInitializedRef.current = true;
    };

    initializeRoom();

    return () => {
      cleanup();
    };
  }, [roomId, user]);

  // Redirect only when we've explicitly left
  useEffect(() => {
    if (loading || !user || !isInitializedRef.current) return;
    const currentUserInRoom = participants.some((p) => p.user_id === user.id);
    if (hasLeftRef.current && !currentUserInRoom) {
      navigate('/study-rooms');
    }
  }, [participants, user, loading, navigate]);

  // Best-effort cleanup on tab close/refresh
  useEffect(() => {
    const onBeforeUnload = () => {
      try { cleanup(); } catch {}
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Setup WebRTC connections when participants change
  useEffect(() => {
    if (!isInitializedRef.current || !user || !localStreamRef.current) return;

    // Deterministic offerer to avoid glare: only the lexicographically smaller user_id initiates
    participants.forEach((participant) => {
      if (participant.user_id === user.id) return;
      const existingConnection = peerConnectionsRef.current.get(participant.user_id);
      if (existingConnection) return;

      const iAmOfferer = String(user.id) < String(participant.user_id);
      if (iAmOfferer) {
        createPeerConnection(participant.user_id, participant.username);
      }
    });

    // Clean up connections for users who left
    peerConnectionsRef.current.forEach((pc, userId) => {
      const stillInRoom = participants.some((p) => p.user_id === userId);
      if (!stillInRoom) {
        closePeerConnection(userId);
      }
    });
  }, [participants, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const cleanup = () => {
    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();

    // Stop all audio elements
    audioElementsRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
      // Remove from DOM if attached
      try {
        if (audio.parentNode) {
          audio.parentNode.removeChild(audio);
        }
      } catch {}
    });
    audioElementsRef.current.clear();

    // Stop local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Unsubscribe from signaling
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }
    isInitializedRef.current = false;
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

  const initializeLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStreamRef.current = stream;

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isAudioOn;
        if ('contentHint' in audioTrack) {
          (audioTrack as any).contentHint = 'speech';
        }
      }

      toast({
        title: 'Success',
        description: 'Microphone connected',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to access microphone. Please check your browser permissions.',
        variant: 'destructive',
      });
      console.error('Error accessing microphone:', err);
    }
  };

  const handleToggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioOn;
        setIsAudioOn(!isAudioOn);
        toast({
          title: isAudioOn ? 'Microphone Off' : 'Microphone On',
          description: isAudioOn ? 'Your microphone is now muted' : 'Your microphone is now active',
        });
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
      }
    }
  };

  const handleLeaveRoom = async () => {
    try {
      hasLeftRef.current = true;
      // Clean up connections, streams, and subscriptions immediately
      cleanup();
      
      // Delete participant record (this removes them from the room)
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
      // Navigate anyway even if delete fails
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

  // Optimized WebRTC functions for audio-only peer connections
  const createPeerConnection = async (participantUserId: string, participantUsername: string) => {
    try {
      const peerConnection = new RTCPeerConnection(rtcConfiguration);
      
      // Add local audio stream
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          peerConnection.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle remote audio stream
      peerConnection.ontrack = (event) => {
        console.log('Received remote audio from:', participantUserId);
        
        const remoteStream = event.streams[0];
        remoteStreamsRef.current.set(participantUserId, remoteStream);

        // Create or update audio element for remote stream
        let audioElement = audioElementsRef.current.get(participantUserId);
        if (!audioElement) {
          audioElement = document.createElement('audio');
          audioElement.autoplay = true;
          audioElement.playsinline = true;
          audioElementsRef.current.set(participantUserId, audioElement);
        }
        
        audioElement.srcObject = remoteStream;
        audioElement.muted = false;
        // Append to hidden container if not already attached
        try {
          if (audioContainerRef.current && !audioContainerRef.current.contains(audioElement)) {
            audioContainerRef.current.appendChild(audioElement);
          }
          audioElement.play?.().catch((err: any) => {
            // Autoplay blocked
            setNeedsAudioUnlock(true);
            console.warn('Autoplay blocked, user interaction required:', err);
          });
        } catch {}
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          try {
            await supabase.from('webrtc_signals').insert({
              room_id: roomId,
              from_user_id: user?.id,
              to_user_id: participantUserId,
              signal_type: 'ice-candidate',
              signal_data: event.candidate.toJSON(),
            });
          } catch (err) {
            console.error('Error sending ICE candidate:', err);
          }
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state with ${participantUsername}:`, peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'closed') {
          closePeerConnection(participantUserId);
        }
      };

      peerConnectionsRef.current.set(participantUserId, peerConnection);

      // Create and send offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        voiceActivityDetection: false,
      });

      await peerConnection.setLocalDescription(offer);

      try {
        await supabase.from('webrtc_signals').insert({
          room_id: roomId,
          from_user_id: user?.id,
          to_user_id: participantUserId,
          signal_type: 'offer',
          signal_data: offer,
        });
      } catch (err) {
        console.error('Error sending offer:', err);
      }

      console.log('Sent offer to:', participantUsername);
    } catch (err) {
      console.error('Error creating peer connection:', err);
    }
  };

  const handleOffer = async (fromUserId: string, offer: RTCSessionDescriptionInit) => {
    try {
      let peerConnection = peerConnectionsRef.current.get(fromUserId);
      
      // Create peer connection if it doesn't exist
      if (!peerConnection) {
        peerConnection = new RTCPeerConnection(rtcConfiguration);
        
        // Add local audio stream
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((track) => {
            peerConnection!.addTrack(track, localStreamRef.current!);
          });
        }

        // Handle remote audio stream
        peerConnection.ontrack = (event) => {
          console.log('Received remote audio from offer peer:', fromUserId);
          
          const remoteStream = event.streams[0];
          remoteStreamsRef.current.set(fromUserId, remoteStream);

          let audioElement = audioElementsRef.current.get(fromUserId);
          if (!audioElement) {
            audioElement = document.createElement('audio');
            audioElement.autoplay = true;
            audioElement.playsinline = true;
            audioElementsRef.current.set(fromUserId, audioElement);
          }
          
          audioElement.srcObject = remoteStream;
          audioElement.muted = false;
          try {
            if (audioContainerRef.current && !audioContainerRef.current.contains(audioElement)) {
              audioContainerRef.current.appendChild(audioElement);
            }
            audioElement.play?.().catch((err: any) => {
              setNeedsAudioUnlock(true);
              console.warn('Autoplay blocked, user interaction required:', err);
            });
          } catch {}
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = async (event) => {
          if (event.candidate) {
            try {
              await supabase.from('webrtc_signals').insert({
                room_id: roomId,
                from_user_id: user?.id,
                to_user_id: fromUserId,
                signal_type: 'ice-candidate',
                signal_data: event.candidate.toJSON(),
              });
            } catch (err) {
              console.error('Error sending ICE candidate:', err);
            }
          }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log(`Connection state with ${fromUserId}:`, peerConnection!.connectionState);
          
          if (peerConnection!.connectionState === 'failed' || peerConnection!.connectionState === 'closed') {
            closePeerConnection(fromUserId);
          }
        };

        peerConnectionsRef.current.set(fromUserId, peerConnection);
      }

      // Set remote description and create answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      try {
        await supabase.from('webrtc_signals').insert({
          room_id: roomId,
          from_user_id: user?.id,
          to_user_id: fromUserId,
          signal_type: 'answer',
          signal_data: answer,
        });
      } catch (err) {
        console.error('Error sending answer:', err);
      }

      console.log('Sent answer to:', fromUserId);
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  };

  const handleAnswer = async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
    try {
      const peerConnection = peerConnectionsRef.current.get(fromUserId);
      
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Set remote description (answer) from:', fromUserId);
      }
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  };

  const handleIceCandidate = async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    try {
      const peerConnection = peerConnectionsRef.current.get(fromUserId);
      
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  };

  const closePeerConnection = (userId: string) => {
    const peerConnection = peerConnectionsRef.current.get(userId);
    if (peerConnection) {
      peerConnection.close();
      peerConnectionsRef.current.delete(userId);
    }

    const audioElement = audioElementsRef.current.get(userId);
    if (audioElement) {
      audioElement.pause();
      audioElement.srcObject = null;
      audioElementsRef.current.delete(userId);
    }

    remoteStreamsRef.current.delete(userId);
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

  const enableAudioPlayback = () => {
    let played = 0;
    audioElementsRef.current.forEach((audio) => {
      try {
        audio.play?.().then(() => {
          played += 1;
        }).catch(() => {});
      } catch {}
    });
    setNeedsAudioUnlock(false);
    toast({
      title: 'Audio Enabled',
      description: played > 0 ? 'Remote audio is now playing' : 'Ready to play audio when available',
    });
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
      <div ref={audioContainerRef} className="absolute opacity-0 pointer-events-none h-0 w-0 -z-10" />
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
          {needsAudioUnlock && (
            <Button
              variant="default"
              size="sm"
              onClick={enableAudioPlayback}
              className="bg-green-600 hover:bg-green-700"
              title="Click once to allow audio"
            >
              Enable Audio
            </Button>
          )}
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
            <Phone className="h-4 w-4" />
            Leave
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Info Section */}
        <div className="flex-1 flex flex-col gap-4">
          <Card className={`flex-1 ${getGlassmorphismClasses()} shadow-lg`}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Room Information</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="lg"
                  variant={isAudioOn ? 'default' : 'destructive'}
                  onClick={handleToggleAudio}
                  className={`rounded-full p-3 shadow-lg transition-all ${
                    isAudioOn
                      ? 'bg-green-500/80 hover:bg-green-600/80'
                      : 'bg-red-500/80 hover:bg-red-600/80'
                  }`}
                  title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {isAudioOn ? (
                    <Mic className="h-5 w-5" />
                  ) : (
                    <MicOff className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
