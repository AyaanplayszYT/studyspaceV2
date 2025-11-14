// src/pages/Inbox.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tabs,
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
  ArrowLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Types
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

// Debounce hook
function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Main Component
export default function Inbox() {
  const navigate = useNavigate();

  // user + data
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [friendRequests, setFriendRequests] = useState<Friendship[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);

  // UI state
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [activeTab, setActiveTab] = useState<'discover' | 'pending' | 'friends' | 'messages'>('messages');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // dialogs
  const [confirmDialog, setConfirmDialog] = useState<null | { title: string; description: string; onConfirm: () => void }>(null);

  // loading
  const [loading, setLoading] = useState(false);

  // autoscroll ref for chat area
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Auth: get current user
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

  // Fetch helpers (memoized)
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
    setFriendRequests((data as Friendship[]) || []);
  }, [user?.id]);

  const fetchFriends = useCallback(async () => {
    if (!user?.id) return;

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

  // Actions
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedFriend || !user?.id) return;
    const payload = {
      from_user_id: user.id,
      to_user_id: selectedFriend.id,
      content: newMessage.trim(),
    };
    setNewMessage('');
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      ...payload,
      created_at: new Date().toISOString(),
    };
    setChatMessages((s) => [...s, optimistic]);

    const { data, error } = await supabase.from('direct_messages').insert([payload]).select().single();
    if (error) {
      console.error('send message error', error);
      setChatMessages((s) => s.filter((m) => m.id !== optimistic.id));
      return;
    }

    setChatMessages((s) => {
      const replaced = s.map((m) => (m.id === optimistic.id ? data : m));
      if (!replaced.some((m) => m.id === data.id)) replaced.push(data);
      return replaced;
    });

    fetchMessages();
  }, [newMessage, selectedFriend, user?.id, fetchMessages]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    setConfirmDialog({
      title: 'Delete message',
      description: 'This will permanently delete the message.',
      onConfirm: async () => {
        setConfirmDialog(null);
        setChatMessages((s) => s.filter((m) => m.id !== messageId));
        const { error } = await supabase.from('direct_messages').delete().eq('id', messageId);
        if (error) console.error('delete message error', error);
      },
    });
  }, []);

  const handleSendFriendRequest = useCallback(async (friendId: string) => {
    if (!user?.id) return;
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

  // Real-time subscription for messages + friendships
  useEffect(() => {
    if (!user?.id) return;

    const msgChannel = supabase
      .channel(`inbox-messages-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => {
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

  // Initial data load once authenticated
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([fetchMessages(), fetchFriendRequests(), fetchFriends(), fetchAllUsers()]).finally(() => setLoading(false));
  }, [user?.id, fetchMessages, fetchFriendRequests, fetchFriends, fetchAllUsers]);

  // Search filtering
  const discoverList = useMemo(() => {
    if (!debouncedSearch) return allUsers;
    const q = debouncedSearch.toLowerCase();
    return allUsers.filter((u) => u.username.toLowerCase().includes(q));
  }, [allUsers, debouncedSearch]);

  // Autoscroll chat area on messages change
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatMessages]);

  // Main layout
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Animated background */}
      <div className="">
        <div className="" />
        <div className="" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Messages</h1>
            <p className="text-sm text-white/40">Direct messaging & friends</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-200 border-blue-400/30">
              {friends.length} friends
            </Badge>
            {friendRequests.length > 0 && (
              <Badge variant="destructive" className="bg-red-500/20 text-red-200 border-red-400/30">
                {friendRequests.length} pending
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="relative z-10 flex-1 flex gap-4 px-6 pb-6 overflow-hidden min-h-0">
        {/* Left sidebar */}
        <div className="w-80 flex flex-col gap-3 min-h-0">
          {/* Search and tabs */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 space-y-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid grid-cols-4 w-full bg-white/5 border border-white/10">
                <TabsTrigger value="messages" title="Messages" className="data-[state=active]:bg-blue-500/30">
                  <MessageSquare className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="friends" title="Friends" className="data-[state=active]:bg-blue-500/30">
                  <Users className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="pending" title="Pending" className="data-[state=active]:bg-blue-500/30 relative">
                  <Mail className="w-4 h-4" />
                  {friendRequests.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="discover" title="Discover" className="data-[state=active]:bg-blue-500/30">
                  <UserPlus className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* List area - scrollable */}
          <div className="flex-1 overflow-y-auto pr-2 min-h-0">
            <div className="space-y-2">
              {activeTab === 'messages' &&
                (messages.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-center">
                    <Mail className="w-8 h-8 text-white/40 mx-auto mb-2" />
                    <h3 className="font-semibold text-white mb-1">No conversations</h3>
                    <p className="text-sm text-white/60">Start by discovering or adding friends</p>
                  </div>
                ) : (
                  (() => {
                    // Group messages by sender and show latest message per sender
                    const messageGroups = new Map<string, Message>();
                    messages.forEach((m) => {
                      if (!messageGroups.has(m.from_user_id) || new Date(m.created_at) > new Date(messageGroups.get(m.from_user_id)!.created_at)) {
                        messageGroups.set(m.from_user_id, m);
                      }
                    });
                    return Array.from(messageGroups.values()).map((m) => {
                      const sender = friends.find((f) => f.id === m.from_user_id) || allUsers.find((u) => u.id === m.from_user_id) || { username: 'Unknown', id: m.from_user_id };
                      const isSelected = selectedFriend?.id === m.from_user_id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedFriend({ id: sender.id, username: sender.username } as Profile);
                            fetchChatMessages(sender.id);
                            // Remove this message from the list
                            setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== m.id));
                          }}
                          className={`w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-3 text-left transition-all ${
                            isSelected ? 'border-blue-400/50 bg-blue-500/10' : 'hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-medium text-sm text-white truncate">{sender.username}</p>
                            <span className="text-xs text-white/50 whitespace-nowrap">{new Date(m.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-white/60 line-clamp-2">{sender.username} sent a message when you were away</p>
                        </button>
                      );
                    });
                  })()
                ))}

              {activeTab === 'friends' &&
                (friends.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-center">
                    <Users className="w-8 h-8 text-white/40 mx-auto mb-2" />
                    <h3 className="font-semibold text-white mb-1">No friends</h3>
                    <p className="text-sm text-white/60">Add friends to get started</p>
                  </div>
                ) : (
                  friends.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSelectedFriend(f);
                        fetchChatMessages(f.id);
                      }}
                      className={`w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-3 text-left transition-all ${
                        selectedFriend?.id === f.id ? 'border-blue-400/50 bg-blue-500/10' : 'hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-white truncate">{f.username}</span>
                        <MessageSquare className="w-4 h-4 flex-shrink-0 text-white/50" />
                      </div>
                    </button>
                  ))
                ))}

              {activeTab === 'pending' &&
                (friendRequests.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-center">
                    <Mail className="w-8 h-8 text-white/40 mx-auto mb-2" />
                    <h3 className="font-semibold text-white mb-1">No requests</h3>
                    <p className="text-sm text-white/60">No friend requests at the moment</p>
                  </div>
                ) : (
                  friendRequests.map((r) => {
                    const requester = allUsers.find((u) => u.id === r.user_id) || { username: 'Unknown' };
                    return (
                      <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-3 space-y-2">
                        <div>
                          <p className="font-medium text-sm text-white">{requester.username}</p>
                          <p className="text-xs text-white/60">sent a friend request</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleAcceptRequest(r.id)}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/20 text-white hover:bg-white/10"
                            onClick={() => handleDeclineRequest(r.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ))}

              {activeTab === 'discover' &&
                (discoverList.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-center">
                    <Search className="w-8 h-8 text-white/40 mx-auto mb-2" />
                    <h3 className="font-semibold text-white mb-1">No users found</h3>
                    <p className="text-sm text-white/60">{searchQuery ? 'Try a different search' : 'Start discovering people'}</p>
                  </div>
                ) : (
                  discoverList.map((u) => (
                    <div key={u.id} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-3 space-y-2">
                      <div>
                        <p className="font-medium text-sm text-white">{u.username}</p>
                        <p className="text-xs text-white/60">{u.id === user?.id ? 'You' : 'User'}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => {
                            setSelectedFriend({ id: u.id, username: u.username });
                            fetchChatMessages(u.id);
                            setActiveTab('messages');
                          }}
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Chat
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10"
                          onClick={() => handleSendFriendRequest(u.id)}
                          disabled={u.id === user?.id}
                        >
                          <UserPlus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ))}
            </div>
          </div>
        </div>

        {/* Right side - Chat */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
          {!selectedFriend ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center max-w-md">
                <div className="rounded-full bg-white/10 p-4 mx-auto mb-4 w-fit">
                  <MessageSquare className="w-8 h-8 text-blue-300" />
                </div>
                <h3 className="font-semibold text-lg text-white mb-2">No conversation selected</h3>
                <p className="text-sm text-white/60">Choose a friend to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedFriend(null); setChatMessages([]); }}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                      <h2 className="font-semibold text-white">{selectedFriend.username}</h2>
                      <p className="text-xs text-white/50">Direct message</p>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleRemoveFriend(selectedFriend.id)}>
                    Remove
                  </Button>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto py-4 px-4 space-y-4 min-h-0" ref={chatScrollRef}>
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center">
                      <div>
                        <MessageSquare className="w-8 h-8 text-white/40 mx-auto mb-2" />
                        <p className="text-sm text-white/60">No messages yet. Start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMine = msg.from_user_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className="flex flex-col max-w-xs gap-1">
                            <div
                              className={`px-4 py-2 rounded-xl ${
                                isMine
                                  ? 'bg-blue-600 text-white rounded-br-none'
                                  : 'bg-white/10 text-white rounded-bl-none border border-white/20'
                              }`}
                            >
                              <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <div className={`text-xs text-white/50 ${isMine ? 'text-right' : 'text-left'} px-1`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {isMine && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-fit h-fit p-1 text-white/50 hover:text-white"
                                onClick={() => handleDeleteMessage(msg.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {typingUsers.size > 0 && (
                    <div className="flex justify-start">
                      <div className="flex flex-col max-w-xs gap-1">
                        <div className="px-4 py-2 rounded-xl bg-white/10 text-white rounded-bl-none border border-white/20">
                          <div className="flex items-center gap-1">
                            <span className="text-sm">{Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing</span>
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Input area */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 flex-shrink-0">
                <div className="flex gap-2">
                  <textarea
                    placeholder="Type a message... (Shift+Enter for new line)"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      // Show typing indicator
                      setIsTyping(true);
                      if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                      }
                      typingTimeoutRef.current = setTimeout(() => {
                        setIsTyping(false);
                      }, 3000);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                        setIsTyping(false);
                      }
                    }}
                    className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/40 rounded-lg p-2 resize-none max-h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                  <Button onClick={handleSendMessage} size="icon" disabled={!newMessage.trim()} className="flex-shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmDialog && (
        <AlertDialog open={true} onOpenChange={(val) => !val && setConfirmDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 mt-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDialog.onConfirm} className="bg-destructive text-destructive-foreground">
                Confirm
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
