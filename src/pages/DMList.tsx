import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, MessageCircle, LogOut, Trash2 } from 'lucide-react';
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
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export default function DMList() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

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

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Direct Messages
              </CardTitle>
              <CardDescription>Connect with other students</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/users')} size="sm">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                New Message
              </Button>
              <Button onClick={signOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading conversations...</p>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No conversations yet.</p>
              <Button onClick={() => navigate('/users')}>Find Users to Chat With</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors group flex justify-between items-start"
                >
                  <Link
                    to={`/dms/${conversation.id}`}
                    className="flex-1"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold">{conversation.username}</h3>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conversation.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {conversation.email}
                    </p>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {conversation.lastMessage}
                    </p>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Chat</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this conversation with {conversation.username}? This will delete all messages. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="flex gap-2">
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
