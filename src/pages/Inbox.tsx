// src/pages/Inbox.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MessageSquare,
  UserPlus,
  Users,
  Search,
  Send,
  Trash2,
  Check,
  X,
  Mail,
} from 'lucide-react';

/**
 * NOTE:
 * - This file expects Tailwind CSS utilities (backdrop-blur, bg-opacity, etc).
 * - If you want to extract the glass class to a global stylesheet, move the <style> contents to your CSS.
 */

// -----------------------------
// Types
// -----------------------------
interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  created_at: string;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

interface Profile {
  id: string;
  username: string;
}

// -----------------------------
// Debounce hook
// -----------------------------
function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// -----------------------------
// Small UI helpers
// -----------------------------
function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="bg-transparent border border-border/10">
      <CardContent className="p-6 text-center text-muted-foreground/70">{children}</CardContent>
    </Card>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, description }: any) {
  return (
    <AlertDialog open={open} onOpenChange={(val) => !val && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3 mt-4">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground">
            Confirm
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// -----------------------------
// Main Component
// -----------------------------
export default function Inbox() {
  const navigate = useNavigate();

  // user + data
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]); // inbox items (recent incoming messages)
  const [friendRequests, setFriendRequests] = useState<Friendship[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);

  // UI state
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [activeTab, setActiveTab] = useState<'discover' | 'pending' | 'friends' | 'messages'>('discover');

  // dialogs
  const [confirmDialog, setConfirmDialog] = useState<null | { title: string; description: string; onConfirm: () => void }>(null);

  // loading
  const [loading, setLoading] = useState(false);

  // autoscroll ref for chat area
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // -----------------------------
  // Auth: get current user
  // -----------------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          navigate('/auth');
          return;
        }
        if (mounted) setUser(authUser);
      } catch (err) {
        console.error('Failed to get user', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  // -----------------------------
  // Fetch helpers (memoized)
  // -----------------------------
  const fetchMessages = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('to_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('fetchMessages error', error);
      return;
    }
    setMessages(data || []);
  }, [user?.id]);

  const fetchFriendRequests = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('friend_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('fetchFriendRequests error', error);
      return;
    }
    setFriendRequests(data || []);
  }, [user?.id]);

  const fetchFriends = useCallback(async () => {
    if (!user?.id) return;

    // fetch accepted where user is sender or receiver
    const { data: sentRequests, error: sentError } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    const { data: receivedRequests, error: receivedError } = await supabase
      .from('friendships')
      .select('user_id')
      .eq('friend_id', user.id)
      .eq('status', 'accepted');

    if (sentError || receivedError) {
      console.error('fetchFriends errors', sentError || receivedError);
      return;
    }

    const friendIds = [
      ...(sentRequests?.map((r: any) => r.friend_id) || []),
      ...(receivedRequests?.map((r: any) => r.user_id) || []),
    ];

    if (friendIds.length === 0) {
      setFriends([]);
      return;
    }

    const { data: friendProfiles, error } = await supabase.from('profiles').select('id, username').in('id', friendIds);
    if (error) {
      console.error('fetch friendProfiles error', error);
      return;
    }
    setFriends(friendProfiles || []);
  }, [user?.id]);

  const fetchAllUsers = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .neq('id', user.id)
      .order('username', { ascending: true })
      .limit(500);

    if (error) {
      console.error('fetchAllUsers error', error);
      return;
    }
    setAllUsers(data || []);
  }, [user?.id]);

  const fetchChatMessages = useCallback(
    async (friendId: string) => {
      if (!user?.id) return;
      const query = supabase
        .from('direct_messages')
        .select('*')
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${friendId}),and(from_user_id.eq.${friendId},to_user_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(500);

      const { data, error } = await query;
      if (error) {
        console.error('fetchChatMessages error', error);
        return;
      }
      setChatMessages(data || []);
    },
    [user?.id]
  );

  // -----------------------------
  // Actions
  // -----------------------------
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedFriend || !user?.id) return;
    const payload = {
      from_user_id: user.id,
      to_user_id: selectedFriend.id,
      content: newMessage.trim(),
    };
    setNewMessage('');
    // optimistic UI: append locally
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      ...payload,
      created_at: new Date().toISOString(),
    };
    setChatMessages((s) => [...s, optimistic]);

    const { data, error } = await supabase.from('direct_messages').insert([payload]).select().single();
    if (error) {
      console.error('send message error', error);
      // remove optimistic
      setChatMessages((s) => s.filter((m) => m.id !== optimistic.id));
      return;
    }

    // replace optimistic with server message (if ids differ)
    setChatMessages((s) => {
      const replaced = s.map((m) => (m.id === optimistic.id ? data : m));
      // if not found, append
      if (!replaced.some((m) => m.id === data.id)) replaced.push(data);
      return replaced;
    });

    // update inbox
    fetchMessages();
  }, [newMessage, selectedFriend, user?.id, fetchMessages]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    // show confirm
    setConfirmDialog({
      title: 'Delete message',
      description: 'This will permanently delete the message.',
      onConfirm: async () => {
        setConfirmDialog(null);
        // optimistic remove
        setChatMessages((s) => s.filter((m) => m.id !== messageId));
        const { error } = await supabase.from('direct_messages').delete().eq('id', messageId);
        if (error) console.error('delete message error', error);
      },
    });
  }, []);

  const handleSendFriendRequest = useCallback(async (friendId: string) => {
    if (!user?.id) return;
    // optimistic pattern: try insert
    try {
      await supabase.from('friendships').insert([{ user_id: user.id, friend_id: friendId, status: 'pending' }]);
      await fetchAllUsers();
    } catch (err) {
      console.error('friend request error', err);
    }
  }, [user?.id, fetchAllUsers]);

  const handleAcceptRequest = useCallback(async (requestId: string) => {
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);
    if (error) console.error('accept request error', error);
    await fetchFriendRequests();
    await fetchFriends();
  }, [fetchFriendRequests, fetchFriends]);

  const handleDeclineRequest = useCallback(async (requestId: string) => {
    const { error } = await supabase.from('friendships').delete().eq('id', requestId);
    if (error) console.error('decline request error', error);
    await fetchFriendRequests();
  }, [fetchFriendRequests]);

  const handleRemoveFriend = useCallback(async (friendId: string) => {
    setConfirmDialog({
      title: 'Remove friend',
      description: 'Are you sure you want to remove this friend?',
      onConfirm: async () => {
        setConfirmDialog(null);
        if (!user?.id) return;
        await supabase
          .from('friendships')
          .delete()
          .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);
        await fetchFriends();
        setSelectedFriend(null);
      },
    });
  }, [user?.id, fetchFriends]);

  // -----------------------------
  // Real-time subscription for messages + friendships
  // -----------------------------
  useEffect(() => {
    if (!user?.id) return;

    const msgChannel = supabase
      .channel(`inbox-messages-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => {
        // re-fetch inbox and open chat
        fetchMessages();
        if (selectedFriend) fetchChatMessages(selectedFriend.id);
      })
      .subscribe();

    const friendChannel = supabase
      .channel(`inbox-friends-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
        fetchFriendRequests();
        fetchFriends();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(friendChannel);
    };
  }, [user?.id, selectedFriend, fetchMessages, fetchChatMessages, fetchFriendRequests, fetchFriends]);

  // -----------------------------
  // Initial data load once authenticated
  // -----------------------------
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([fetchMessages(), fetchFriendRequests(), fetchFriends(), fetchAllUsers()]).finally(() => setLoading(false));
  }, [user?.id, fetchMessages, fetchFriendRequests, fetchFriends, fetchAllUsers]);

  // -----------------------------
  // Search filtering
  // -----------------------------
  const discoverList = useMemo(() => {
    if (!debouncedSearch) return allUsers;
    const q = debouncedSearch.toLowerCase();
    return allUsers.filter((u) => u.username.toLowerCase().includes(q));
  }, [allUsers, debouncedSearch]);

  // -----------------------------
  // Autoscroll chat area on messages change
  // -----------------------------
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    // smooth scroll to bottom
    el.scrollTop = el.scrollHeight;
  }, [chatMessages]);

  // -----------------------------
  // UI building blocks
  // -----------------------------
  const leftSidebar = (
    <div className="w-72 flex-shrink-0">
      <div className="glass p-4 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-foreground/90">
            <Users className="w-5 h-5" />
            <h3 className="text-sm font-semibold">Friends</h3>
          </div>
          <div className="text-xs text-muted-foreground/70">{friends.length}</div>
        </div>

        <ScrollArea className="h-64">
          <div className="space-y-2">
            {friends.length === 0 ? (
              <p className="text-xs text-muted-foreground/70">No friends yet</p>
            ) : (
              friends.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedFriend(f);
                      fetchChatMessages(f.id);
                    }}
                    className={`text-left truncate flex-1 px-3 py-2 rounded-lg transition-all text-sm ${selectedFriend?.id === f.id ? 'bg-primary/80 text-primary-foreground shadow-md' : 'hover:bg-muted/40'}`}
                  >
                    {f.username}
                  </button>
                  <Button size="icon" variant="ghost" onClick={() => handleRemoveFriend(f.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="mt-4">
          <Card className="glass p-1">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <div className="text-xs">
                  <div className="font-medium">{messages.length} unread</div>
                  <div className="text-muted-foreground text-[11px]">Inbox</div>
                </div>
              </div>
              <Button size="sm" onClick={fetchMessages}>Refresh</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const ChatView = selectedFriend ? (
    <div className="flex-1 flex flex-col h-full rounded-2xl overflow-hidden glass-border">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold">{selectedFriend.username}</div>
            <div className="text-xs text-muted-foreground">Chat</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleRemoveFriend(selectedFriend.id)}>
            Remove
          </Button>
          <Button size="sm" onClick={() => { setSelectedFriend(null); setChatMessages([]); }}>Back</Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-6 overflow-y-auto" ref={chatScrollRef}>
        <div className="space-y-4">
          {chatMessages.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">No messages yet. Start the convo.</div>
          ) : (
            chatMessages.map((msg) => {
              const isMine = msg.from_user_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className="relative max-w-[70%]">
                    <div className={`px-5 py-3 ${isMine ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted/50'} ${isMine ? 'rounded-2xl' : 'rounded-2xl'}`}>
                      <p className="break-words text-sm">{msg.content}</p>
                      <div className="text-[11px] mt-1 text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</div>
                    </div>

                    {/* delete button inside container so it doesn't spill out */}
                    {isMine && (
                      <div className="mt-1 flex justify-end">
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteMessage(msg.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/6 flex gap-3 items-center">
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          className="flex-1"
        />
        <Button onClick={handleSendMessage} size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex-1 flex items-center justify-center glass p-8 rounded-2xl">
      <div className="text-center text-muted-foreground">
        <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
        <p className="text-sm">Pick a friend or start a new chat from Discover.</p>
      </div>
    </div>
  );

  const TabsView = (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full flex-1 flex flex-col">
      <TabsList className="grid grid-cols-4 gap-1 bg-transparent p-1 rounded-lg mb-4">
        <TabsTrigger value="discover" className="data-[state=active]:bg-primary/80 data-[state=active]:text-white">Discover</TabsTrigger>
        <TabsTrigger value="pending" className="data-[state=active]:bg-primary/80 data-[state=active]:text-white">Pending</TabsTrigger>
        <TabsTrigger value="friends" className="data-[state=active]:bg-primary/80 data-[state=active]:text-white">Friends</TabsTrigger>
        <TabsTrigger value="messages" className="data-[state=active]:bg-primary/80 data-[state=active]:text-white">Messages</TabsTrigger>
      </TabsList>

      <TabsContent value="discover" className="flex-1 overflow-hidden">
        <div className="flex flex-col h-full gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 max-w-md" />
          </div>

          <ScrollArea className="flex-1 pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discoverList.length === 0 ? (
                <EmptyCard>No users found</EmptyCard>
              ) : (
                discoverList.map((u) => (
                  <Card key={u.id} className="glass p-0 rounded-lg hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium truncate">{u.username}</div>
                          <div className="text-xs text-muted-foreground">{u.id === user?.id ? 'You' : null}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" onClick={() => { setSelectedFriend({ id: u.id, username: u.username }); fetchChatMessages(u.id); }}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Chat
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleSendFriendRequest(u.id)}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </TabsContent>

      <TabsContent value="pending" className="flex-1 overflow-hidden">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3">
            {friendRequests.length === 0 ? (
              <EmptyCard>No pending requests</EmptyCard>
            ) : (
              friendRequests.map((r) => {
                const requester = allUsers.find((u) => u.id === r.user_id) || { username: 'Unknown' };
                return (
                  <Card key={r.id} className="glass rounded-lg">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{requester.username}</div>
                        <div className="text-sm text-muted-foreground">Requested</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleAcceptRequest(r.id)} className="h-8 w-8 p-0 text-green-600">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeclineRequest(r.id)} className="h-8 w-8 p-0 text-red-600">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="friends" className="flex-1 overflow-hidden">
        <ScrollArea className="flex-1 pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.length === 0 ? (
              <EmptyCard>No friends yet</EmptyCard>
            ) : (
              friends.map((f) => (
                <Card key={f.id} className="glass rounded-lg cursor-pointer" onClick={() => { setSelectedFriend(f); fetchChatMessages(f.id); }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{f.username}</div>
                          <div className="text-xs text-muted-foreground">Friend</div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedFriend(f); fetchChatMessages(f.id); }}>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="messages" className="flex-1 overflow-hidden">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <EmptyCard>No messages yet</EmptyCard>
            ) : (
              messages.map((m) => {
                const sender = friends.find((f) => f.id === m.from_user_id) || allUsers.find((u) => u.id === m.from_user_id) || { username: 'Unknown' };
                return (
                  <Card key={m.id} className="glass rounded-lg cursor-pointer" onClick={() => {
                    const senderProfile = friends.find((f) => f.id === m.from_user_id) || { id: m.from_user_id, username: sender.username } as Profile;
                    setSelectedFriend(senderProfile);
                    fetchChatMessages(senderProfile.id);
                  }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{sender.username}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">{m.content}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );

  // -----------------------------
  // Layout
  // -----------------------------
  return (
    <>
      {/* local glass CSS (move to globals.css if you want) */}
      <style>{`
        .glass {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(12px) saturate(140%);
        }
        .glass-border {
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(14px) saturate(135%);
        }
      `}</style>

      <div className="min-h-screen w-full" style={{ background: 'linear-gradient(180deg,#020617 0%, #08122a 100%)' }}>
        <div className="p-6 h-[calc(100vh-24px)]">
          <div className="flex gap-6 h-full">
            {leftSidebar}
            <div className="flex-1 flex flex-col">
              {/* top small header */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-white">Inbox</h1>
                  <p className="text-sm text-muted-foreground">Direct messages</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setSelectedFriend(null); setActiveTab('discover'); }}>
                    Discover
                  </Button>
                </div>
              </div>

              <div className="flex-1 flex gap-6">
                {/* Conversations column */}
                <div className="w-96 flex-shrink-0">
                  <div className="glass p-3 rounded-xl h-full flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2"><Search className="w-4 h-4 text-muted-foreground" /><h4 className="font-semibold">Conversations</h4></div>
                      <div className="text-xs text-muted-foreground/70">{messages.length}</div>
                    </div>

                    <div className="mb-3">
                      <Input placeholder="Search messages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>

                    <ScrollArea className="flex-1 pr-2">
                      <div className="space-y-3">
                        {messages.length === 0 ? <EmptyCard>No conversations</EmptyCard> : messages.map((m) => {
                          const sender = friends.find(f => f.id === m.from_user_id) || allUsers.find(u => u.id === m.from_user_id) || { username: 'Unknown', id: m.from_user_id };
                          return (
                            <div key={m.id} className="glass p-3 rounded-lg hover:shadow-md cursor-pointer" onClick={() => { const profile = { id: sender.id, username: sender.username } as Profile; setSelectedFriend(profile); fetchChatMessages(profile.id); }}>
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium truncate">{sender.username}</div>
                                  <div className="text-sm text-muted-foreground line-clamp-2">{m.content}</div>
                                </div>
                                <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                {/* Main: Chat or Tabs */}
                <div className="flex-1 flex flex-col">
                  {selectedFriend ? ChatView : TabsView}
                </div>
              </div>
            </div>
          </div>
        </div>

        {confirmDialog && (
          <ConfirmDialog open={true} onClose={() => setConfirmDialog(null)} title={confirmDialog.title} description={confirmDialog.description} onConfirm={confirmDialog.onConfirm} />
        )}
      </div>
    </>
  );
}
