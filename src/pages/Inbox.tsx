import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, UserPlus, Users, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DirectMessage {
  id: string;
  content: string;
  read: boolean;
  created_at: string;
  from_user: {
    username: string;
  };
}

interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  friend: {
    username: string;
    email: string;
  };
  user: {
    username: string;
  };
}

const Inbox = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const { toast } = useToast();





  useEffect(() => {
    fetchMessages();
    fetchFriendRequests();

    // Subscribe to new messages
    const channel = supabase
      .channel('direct_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('direct_messages')
      .select(`
        *,
        from_user:profiles!direct_messages_from_user_id_fkey(username)
      `)
      .eq('to_user_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMessages(data);
    }
  };

  const fetchFriendRequests = async () => {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        user:profiles!friendships_user_id_fkey(username),
        friend:profiles!friendships_friend_id_fkey(username, email)
      `)
      .or(`user_id.eq.${user?.id},friend_id.eq.${user?.id}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFriendRequests(data);
    }
  };

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: friendProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', friendEmail)
      .single();

    if (!friendProfile) {
      toast({
        title: 'Error',
        description: 'User not found',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.from('friendships').insert({
      user_id: user?.id,
      friend_id: friendProfile.id,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send friend request',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Friend request sent',
      });
      setOpen(false);
      setFriendEmail('');
      fetchFriendRequests();
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (!error) {
      toast({
        title: 'Success',
        description: 'Friend request accepted',
      });
      fetchFriendRequests();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inbox</h1>
          <p className="text-muted-foreground">Messages and friend requests</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Friend
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Friend</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSendFriendRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Friend's Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  placeholder="friend@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full">Send Request</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          {messages.map((message) => (
            <Card key={message.id} className="shadow-card hover:shadow-card-hover transition-smooth">
              <CardContent className="pt-6 flex items-start gap-3 justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Mail className="h-5 w-5 text-accent mt-1" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm mb-1">From: {message.from_user.username}</p>
                    <p className="text-sm text-muted-foreground">{message.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(message.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteMessage(message.id)}
                  aria-label="Delete Message"
                >
                  <Trash2 className="h-5 w-5 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}

          {messages.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No messages yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="friends" className="space-y-4">
          {friendRequests.map((request) => (
            <Card key={request.id} className="shadow-card hover:shadow-card-hover transition-smooth">
              <CardContent className="pt-6 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-accent" />
                  <div>
                    <p className="font-semibold">
                      {request.user_id === user?.id ? request.friend.username : request.user.username}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">{request.status}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {request.status === 'pending' && request.friend_id === user?.id && (
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRequest(request.id)}
                    >
                      Accept
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteFriendRequest(request.id)}
                    aria-label="Delete Friend Request"
                  >
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {friendRequests.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No friend requests yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Inbox;
