import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Lock, Unlock, AlertCircle, CheckCircle, Users, PenTool } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Settings {
  id: string;
  notes_locked: boolean;
  ai_locked: boolean;
  chat_locked: boolean;
  tasks_locked: boolean;
  study_rooms_locked: boolean;
  whiteboard_locked: boolean;
  updated_at: string;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single() as any;
      
      setIsAdmin(data?.is_admin || false);
    };

    checkAdmin();
  }, [user]);

  // Fetch settings
  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
      fetchAdmins();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single() as any;

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to load settings',
          variant: 'destructive',
        });
      } else {
        setSettings(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, email, is_admin')
        .eq('is_admin', true) as any;

      setAdminUsers(data || []);
    } catch (err) {
      console.error('Error fetching admins:', err);
    }
  };

  const updateSetting = async (key: keyof Omit<Settings, 'id' | 'updated_at'>, value: boolean) => {
    if (!settings) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update({ [key]: value })
        .eq('id', settings.id) as any;

      if (error) throw error;

      setSettings({ ...settings, [key]: value });
      toast({
        title: 'Success',
        description: `${key.replace(/_/g, ' ')} ${value ? 'locked' : 'unlocked'}`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update setting',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addAdminUser = async () => {
    if (!userEmail) return;

    setAddingAdmin(true);
    try {
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, is_admin')
        .eq('email', userEmail)
        .single() as any;

      if (!userData) {
        toast({
          title: 'Error',
          description: 'User not found',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', userData.id) as any;

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${userEmail} is now an admin`,
      });

      setUserEmail('');
      fetchAdmins();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add admin',
        variant: 'destructive',
      });
    } finally {
      setAddingAdmin(false);
    }
  };

  const removeAdminUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: false })
        .eq('id', userId) as any;

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Admin removed',
      });

      fetchAdmins();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to remove admin',
        variant: 'destructive',
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You do not have admin privileges.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage application settings and controls</p>
        </div>
        <Badge variant="outline" className="gap-2">
          <Lock className="h-4 w-4" />
          Admin
        </Badge>
      </div>

      {/* Feature Locks */}
      {settings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Notes
              </CardTitle>
              <CardDescription>Lock/unlock note creation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Only Admins Can Post</span>
                <Switch
                  checked={settings.notes_locked}
                  onCheckedChange={(value) => updateSetting('notes_locked', value)}
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {settings.notes_locked
                  ? 'Only admins can create and post notes'
                  : 'All users can create and post notes'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                AI Chat
              </CardTitle>
              <CardDescription>Lock/unlock AI features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Only Admins Can Use</span>
                <Switch
                  checked={settings.ai_locked}
                  onCheckedChange={(value) => updateSetting('ai_locked', value)}
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {settings.ai_locked
                  ? 'Only admins can access AI chat'
                  : 'All users can access AI chat'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                General Chat
              </CardTitle>
              <CardDescription>Lock/unlock chat messaging</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Lock Chat</span>
                <Switch
                  checked={settings.chat_locked}
                  onCheckedChange={(value) => updateSetting('chat_locked', value)}
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {settings.chat_locked
                  ? 'General chat is locked for all users'
                  : 'All users can send messages in chat'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Tasks
              </CardTitle>
              <CardDescription>Lock/unlock task creation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Only Admins Can Create</span>
                <Switch
                  checked={settings.tasks_locked}
                  onCheckedChange={(value) => updateSetting('tasks_locked', value)}
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {settings.tasks_locked
                  ? 'Only admins can create tasks'
                  : 'All users can create tasks'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Study Rooms
              </CardTitle>
              <CardDescription>Lock/unlock study room features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Lock Study Rooms</span>
                <Switch
                  checked={settings.study_rooms_locked}
                  onCheckedChange={(value) => updateSetting('study_rooms_locked', value)}
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {settings.study_rooms_locked
                  ? 'Study rooms are locked for all users'
                  : 'All users can create and join study rooms'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                Whiteboard
              </CardTitle>
              <CardDescription>Lock/unlock collaborative whiteboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Lock Whiteboard</span>
                <Switch
                  checked={settings.whiteboard_locked}
                  onCheckedChange={(value) => updateSetting('whiteboard_locked', value)}
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {settings.whiteboard_locked
                  ? 'Whiteboard is locked for all users'
                  : 'All users can draw on the whiteboard'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Admin Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Admin Management
          </CardTitle>
          <CardDescription>Add or remove admin users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Add Admin by Email</Label>
            <div className="flex gap-2">
              <Input
                id="admin-email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@example.com"
              />
              <Button onClick={addAdminUser} disabled={addingAdmin || !userEmail}>
                {addingAdmin ? 'Adding...' : 'Add Admin'}
              </Button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-3">Current Admins</h3>
            <div className="space-y-2">
              {adminUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No admins yet</p>
              ) : (
                adminUsers.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{admin.username}</p>
                      <p className="text-xs text-muted-foreground">{admin.email}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeAdminUser(admin.id)}
                      disabled={admin.id === user?.id}
                      title={admin.id === user?.id ? 'Cannot remove yourself' : 'Remove admin'}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
