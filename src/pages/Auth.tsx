import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ChangelogDialog } from '@/components/ChangelogDialog';
import { z } from 'zod';
import { Mail, User, Lock } from 'lucide-react';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  firstName: z.string().min(1, 'Name is required').optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const username = firstName.toLowerCase().replace(/\s+/g, '');
      const validatedData = authSchema.parse({ email, password, username, firstName });
      setLoading(true);

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: username,
            full_name: validatedData.firstName,
          },
        },
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Account created successfully. You can now sign in.',
      });
      setActiveTab('signin');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to create account',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = authSchema.parse({ email, password });
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Signed in successfully.',
      });
      navigate('/');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to sign in',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('/background.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
      </div>

      <div className="absolute top-6 right-6 animate-in fade-in slide-in-from-top-4 duration-500">
        <ChangelogDialog />
      </div>
      
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-700">
        <div className="px-8 py-8">
          {/* Tab switcher */}
          <div className="flex bg-white/10 backdrop-blur rounded-full p-1 mb-8 animate-in fade-in slide-in-from-top-2 duration-500 [animation-delay:200ms]">
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2.5 px-6 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === 'signup'
                  ? 'bg-white/20 text-white shadow-lg scale-105'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              Sign up
            </button>
            <button
              onClick={() => setActiveTab('signin')}
              className={`flex-1 py-2.5 px-6 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === 'signin'
                  ? 'bg-white/20 text-white shadow-lg scale-105'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              Sign in
            </button>
          </div>

          <div className="relative overflow-hidden">
            <div 
              className={`transition-all duration-500 ease-out ${
                activeTab === 'signup' 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 -translate-x-full absolute inset-0'
              }`}
            >
              <h2 className="text-2xl font-semibold text-white mb-6 animate-in fade-in slide-in-from-left-4 duration-500 [animation-delay:300ms]">Create an account</h2>
              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Full name */}
                <div className="relative animate-in fade-in slide-in-from-left-4 duration-500 [animation-delay:400ms] group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50 transition-colors group-focus-within:text-white/80" />
                  <Input
                    type="text"
                    placeholder="Full name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="bg-white/10 backdrop-blur border-white/20 text-white placeholder:text-white/50 h-12 rounded-xl pl-12 transition-all duration-300 focus:ring-2 focus:ring-white/30 focus:border-white/30 hover:border-white/30 focus:bg-white/15"
                  />
                </div>

                {/* Email */}
                <div className="relative animate-in fade-in slide-in-from-left-4 duration-500 [animation-delay:500ms] group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50 transition-colors group-focus-within:text-white/80" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/10 backdrop-blur border-white/20 text-white placeholder:text-white/50 h-12 rounded-xl pl-12 transition-all duration-300 focus:ring-2 focus:ring-white/30 focus:border-white/30 hover:border-white/30 focus:bg-white/15"
                  />
                </div>

                {/* Password */}
                <div className="relative animate-in fade-in slide-in-from-left-4 duration-500 [animation-delay:600ms] group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50 transition-colors group-focus-within:text-white/80" />
                  <Input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/10 backdrop-blur border-white/20 text-white placeholder:text-white/50 h-12 rounded-xl pl-12 transition-all duration-300 focus:ring-2 focus:ring-white/30 focus:border-white/30 hover:border-white/30 focus:bg-white/15"
                  />
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 [animation-delay:700ms]">
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-white/90 hover:bg-white text-zinc-900 font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-white/20 active:scale-[0.98]"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating account...
                      </span>
                    ) : 'Create an account'}
                  </Button>
                </div>
              </form>
            </div>

            <div 
              className={`transition-all duration-500 ease-out ${
                activeTab === 'signin' 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 translate-x-full absolute inset-0'
              }`}
            >
              <h2 className="text-2xl font-semibold text-white mb-6">Welcome back</h2>
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Email */}
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50 transition-colors group-focus-within:text-white/80" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/10 backdrop-blur border-white/20 text-white placeholder:text-white/50 h-12 rounded-xl pl-12 transition-all duration-300 focus:ring-2 focus:ring-white/30 focus:border-white/30 hover:border-white/30 focus:bg-white/15"
                  />
                </div>

                {/* Password */}
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50 transition-colors group-focus-within:text-white/80" />
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/10 backdrop-blur border-white/20 text-white placeholder:text-white/50 h-12 rounded-xl pl-12 transition-all duration-300 focus:ring-2 focus:ring-white/30 focus:border-white/30 hover:border-white/30 focus:bg-white/15"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-white/90 hover:bg-white text-zinc-900 font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-white/20 active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : 'Sign in'}
                </Button>
              </form>
            </div>
          </div>

          {/* Terms */}
          <p className="text-center text-xs text-white/50 mt-6 animate-in fade-in duration-500 [animation-delay:800ms]">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-white/70 hover:text-white underline transition-colors duration-300">Terms & Service</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
