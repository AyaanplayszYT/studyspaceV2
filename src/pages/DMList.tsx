import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquarePlus, MessageCircle, Trash2, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Conversation {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export default function DMList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchConversations();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('dm_list_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Get all conversation partners
      const { data: conversationPartners } = await supabase.rpc('get_dm_conversations', {
        user_id: user.id,
      });

      if (!conversationPartners) {
        setConversations([]);
        return;
      }

      // Get last message for each conversation
      const conversationsWithMessages = await Promise.all(
        conversationPartners.map(async (partner: any) => {
          const { data: messages } = await supabase
            .from('direct_messages')
            .select('content, created_at')
            .or(
              `and(from_user_id.eq.${user.id},to_user_id.eq.${partner.id}),and(from_user_id.eq.${partner.id},to_user_id.eq.${user.id})`
            )
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...partner,
            lastMessage: messages?.[0]?.content || 'No messages yet',
            lastMessageTime: messages?.[0]?.created_at,
          };
        })
      );

      setConversations(conversationsWithMessages);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveChat = async (conversationId: string) => {
    try {
      // Delete all messages in this conversation
      await supabase
        .from('direct_messages')
        .delete()
        .or(`and(from_user_id.eq.${user?.id},to_user_id.eq.${conversationId}),and(from_user_id.eq.${conversationId},to_user_id.eq.${user?.id})`);
      
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    } catch (error) {
      console.error('Error removing chat:', error);
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container max-w-5xl mx-auto py-6 px-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageCircle className="h-8 w-8" />
              Messages
            </h1>
            <p className="text-muted-foreground mt-1">Connect with your study partners</p>
          </div>
          <Button onClick={() => navigate('/users')} size="lg" className="gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            New Chat
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading conversations...</p>
              </div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-16 px-4">
              {conversations.length === 0 ? (
                <>
                  <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                  <p className="text-muted-foreground mb-6">Start a conversation by finding users to chat with</p>
                  <Button onClick={() => navigate('/users')} size="lg" className="gap-2">
                    <Users className="h-5 w-5" />
                    Discover Users
                  </Button>
                </>
              ) : (
                <>
                  <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-muted-foreground">Try searching with a different name or email</p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="group hover:bg-accent/50 transition-all duration-200"
                >
                  <div className="flex items-center gap-4 p-4">
                    <Link
                      to={`/dms/${conversation.id}`}
                      className="flex-1 flex items-center gap-4 min-w-0"
                    >
                      <div className="relative">
                        <Avatar className="w-14 h-14 border-2 border-border">
                          <AvatarImage src={conversation.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                            {conversation.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.unreadCount && conversation.unreadCount > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-lg truncate">{conversation.username}</h3>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(conversation.lastMessageTime)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground/80 truncate mb-1">
                          {conversation.lastMessage || 'No messages yet'}
                        </p>
                      </div>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete your conversation with <span className="font-semibold">{conversation.username}</span> and all messages. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex gap-2 justify-end">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleRemoveChat(conversation.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
