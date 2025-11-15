import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useThemeManager } from '@/hooks/use-theme-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Lock, User, Palette, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTheme, changeTheme } = useThemeManager();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loadingUsername, setLoadingUsername] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingPrivacy, setLoadingPrivacy] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('username, is_public')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setUsername(data.username);
        setIsPublic(data.is_public ?? true);
      }
    };

    fetchProfile();
  }, [user]);

  const handleUsernameChange = async () => {
    if (!user || !username.trim()) {
      toast({
        title: 'Error',
        description: 'Username cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setLoadingUsername(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Username updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update username',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsername(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'All password fields are required',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoadingPassword(true);
    try {
      // First verify current password by attempting to sign in
      if (!user?.email) throw new Error('User email not found');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) throw new Error('Current password is incorrect');

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Password updated successfully',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update password',
        variant: 'destructive',
      });
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) {
      toast({
        title: 'Error',
        description: 'User email not found',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Password reset email sent. Check your inbox.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send reset email',
        variant: 'destructive',
      });
    }
  };

  const handlePrivacyToggle = async (value: boolean) => {
    if (!user) return;
    
    setLoadingPrivacy(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_public: value })
        .eq('id', user.id);

      if (error) throw error;

      setIsPublic(value);
      toast({
        title: 'Success',
        description: value 
          ? 'Profile is now public. You appear in the community leaderboard.' 
          : 'Profile is now private. You are hidden from the community leaderboard.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update privacy settings',
        variant: 'destructive',
      });
    } finally {
      setLoadingPrivacy(false);
    }
  };

  const THEMES = [
    {
      id: 'default',
      name: 'Default Dark',
      description: 'A sleek dark theme',
      bgImage: 'url(/background.png)',
      colors: 'bg-slate-900',
    },
    {
      id: 'forest',
      name: 'Forest Green',
      description: 'A lush green theme',
      bgImage: 'url(/background2.png)',
      colors: 'bg-emerald-900',
    },
    {
      id: 'purple',
      name: 'Mystical Purple',
      description: 'An elegant dark purple theme',
      bgImage: 'url(/background3.png)',
      colors: 'bg-purple-900',
    },
  ];

  const handleThemeChange = (themeId: string) => {
    changeTheme(themeId);
    
    toast({
      title: 'Success',
      description: `Theme changed to ${THEMES.find((t) => t.id === themeId)?.name}`,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your account preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Password</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Theme</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Username</CardTitle>
              <CardDescription>Change your username</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                />
              </div>
              <Button onClick={handleUsernameChange} disabled={loadingUsername}>
                {loadingUsername ? 'Updating...' : 'Update Username'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email</CardTitle>
              <CardDescription>Your account email address</CardDescription>
            </CardHeader>
            <CardContent>
              <Input value={user?.email || ''} disabled />
              <p className="text-xs text-muted-foreground mt-2">
                Email cannot be changed. Contact support if needed.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                />
              </div>
              <Button onClick={handlePasswordChange} disabled={loadingPassword}>
                {loadingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>Send a password reset email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If you forgot your password, you can request a reset email.
              </p>
              <Button variant="outline" onClick={handleResetPassword}>
                Send Reset Email
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Visibility</CardTitle>
              <CardDescription>Control who can see your profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Make Profile Public</Label>
                  <p className="text-sm text-muted-foreground">
                    {isPublic 
                      ? 'Your profile appears in the community leaderboard' 
                      : 'Your profile is hidden from other users'}
                  </p>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={handlePrivacyToggle}
                  disabled={loadingPrivacy}
                />
              </div>
              
              <div className="space-y-3 p-4 bg-muted/20 rounded-lg">
                <h4 className="font-semibold text-sm">Public Profile Shows:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Your username</li>
                  <li>✓ Your rank and points</li>
                  <li>✓ Your study streak</li>
                  <li>✗ Your email (never shared)</li>
                  <li>✗ Your personal notes (only public notes visible)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Choose a Theme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {THEMES.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleThemeChange(t.id)}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      currentTheme === t.id
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <div
                      className={`w-full h-32 rounded-md mb-3 ${t.colors} opacity-30 border border-border`}
                      style={{
                        backgroundImage: t.bgImage,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{t.name}</h3>
                        {currentTheme === t.id && (
                          <Badge variant="default" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
