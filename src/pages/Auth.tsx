import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ChangelogDialog } from '@/components/ChangelogDialog';
import { z } from 'zod';
import { Mail, User, Lock } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      className="min-h-screen flex flex-col md:flex-row overflow-hidden relative"
      style={{
        backgroundImage: `url('/background.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Subtle global overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0" />

      {/* Branding Section (Left on Desktop, Top on Mobile) */}
      <div 
        className="hidden md:flex md:w-1/2 p-8 lg:p-12 flex-col justify-between relative z-10 bg-black/30 backdrop-blur-md border-r border-white/10"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              <div className="w-4 h-4 bg-zinc-950 rounded-sm" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight drop-shadow-md">StudySpace</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            Your personal space for focused learning.
          </h1>
          <p className="text-lg text-white/80 drop-shadow-md">
            Join thousands of students organizing their study materials, taking tests, and tracking their progress all in one place.
          </p>
        </div>

        {/* Decorative blur elements for branding side */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/40 rounded-full blur-[100px]" />
          <div className="absolute top-1/4 right-0 w-72 h-72 bg-accent/30 rounded-full blur-[80px]" />
        </div>
      </div>

      {/* Form Section (Right on Desktop, Full on Mobile) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 relative min-h-screen md:min-h-0 bg-black/20 backdrop-blur-xl z-10">
        <div className="absolute top-6 right-6 z-50">
          <ChangelogDialog />
        </div>
        
        <div className="w-full max-w-md z-10 relative">
          
          <div className="md:hidden flex items-center justify-center gap-2 mb-10">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-zinc-950 rounded-sm" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">StudySpace</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
            {/* Tab switcher */}
            <div className="flex bg-white/5 rounded-full p-1 mb-8">
              <button
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-2.5 px-6 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === 'signup'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                Sign up
              </button>
              <button
                onClick={() => setActiveTab('signin')}
                className={`flex-1 py-2.5 px-6 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === 'signin'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                Sign in
              </button>
            </div>

            <div className="relative overflow-hidden min-h-[320px]">
              <div 
                className={`transition-all duration-500 ease-out absolute inset-0 w-full ${
                  activeTab === 'signup' 
                    ? 'opacity-100 translate-x-0 relative' 
                    : 'opacity-0 -translate-x-full pointer-events-none'
                }`}
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-white">Create an account</h2>
                  <p className="text-sm text-white/50 mt-1">Enter your details to get started</p>
                </div>
                
                <form onSubmit={handleSignUp} className="space-y-4">
                  {/* Full name */}
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 transition-colors group-focus-within:text-white" />
                    <Input
                      type="text"
                      placeholder="Full name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-12 rounded-xl pl-12 transition-all duration-300 focus:ring-1 focus:ring-white/20 focus:border-white/20 hover:border-white/20 hover:bg-white/10"
                    />
                  </div>

                  {/* Email */}
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 transition-colors group-focus-within:text-white" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-12 rounded-xl pl-12 transition-all duration-300 focus:ring-1 focus:ring-white/20 focus:border-white/20 hover:border-white/20 hover:bg-white/10"
                    />
                  </div>

                  {/* Password */}
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 transition-colors group-focus-within:text-white" />
                    <Input
                      type="password"
                      placeholder="Password (min 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-12 rounded-xl pl-12 transition-all duration-300 focus:ring-1 focus:ring-white/20 focus:border-white/20 hover:border-white/20 hover:bg-white/10"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-white text-zinc-950 hover:bg-zinc-200 mt-2 font-semibold rounded-xl transition-all duration-300 active:scale-[0.98]"
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
                </form>
              </div>

              <div 
                className={`transition-all duration-500 ease-out absolute inset-0 w-full ${
                  activeTab === 'signin' 
                    ? 'opacity-100 translate-x-0 relative' 
                    : 'opacity-0 translate-x-full pointer-events-none'
                }`}
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
                  <p className="text-sm text-white/50 mt-1">Sign in to your account to continue</p>
                </div>
                
                <form onSubmit={handleSignIn} className="space-y-4">
                  {/* Email */}
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 transition-colors group-focus-within:text-white" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-12 rounded-xl pl-12 transition-all duration-300 focus:ring-1 focus:ring-white/20 focus:border-white/20 hover:border-white/20 hover:bg-white/10"
                    />
                  </div>

                  {/* Password */}
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 transition-colors group-focus-within:text-white" />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-12 rounded-xl pl-12 transition-all duration-300 focus:ring-1 focus:ring-white/20 focus:border-white/20 hover:border-white/20 hover:bg-white/10"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-white text-zinc-950 hover:bg-zinc-200 mt-2 font-semibold rounded-xl transition-all duration-300 active:scale-[0.98]"
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
            <p className="text-center text-xs text-zinc-500 mt-8">
              By continuing, you agree to our{' '}
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-zinc-300 hover:text-white underline transition-colors cursor-pointer">Terms of Service</button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800 text-zinc-200">
                  <DialogHeader>
                    <DialogTitle className="text-white">Terms of Service</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                      Last updated: {new Date().toLocaleDateString()}
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-[400px] mt-4 pr-4 text-sm text-zinc-300">
                    <div className="space-y-4">
                      <p><strong>1. Acceptance of Terms</strong><br/>By accessing and using StudySpace, you accept and agree to be bound by the terms and provision of this agreement.</p>
                      <p><strong>2. User Accounts</strong><br/>To use certain features of the platform, you must register for an account. You agree to provide accurate information and keep it updated.</p>
                      <p><strong>3. Privacy & Data</strong><br/>Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information.</p>
                      <p><strong>4. User Content</strong><br/>You retain all rights to any content you submit, post or display on or through the service. However, by submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use it in connection with the service.</p>
                      <p><strong>5. Acceptable Use</strong><br/>You agree not to misuse our services or help anyone else do so. You must only use our services as permitted by law.</p>
                      <p><strong>6. Termination</strong><br/>We may terminate or suspend your access to our service immediately, without prior notice or liability, for any reason.</p>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              {' '}and{' '}
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-zinc-300 hover:text-white underline transition-colors cursor-pointer">Privacy Policy</button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800 text-zinc-200">
                  <DialogHeader>
                    <DialogTitle className="text-white">Privacy Policy</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                      Last updated: {new Date().toLocaleDateString()}
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-[400px] mt-4 pr-4 text-sm text-zinc-300">
                    <div className="space-y-4">
                      <p><strong>1. Information We Collect</strong><br/>We collect information you provide directly to us, such as when you create or modify your account, or contact us.</p>
                      <p><strong>2. How We Use Information</strong><br/>We use the information we collect to provide, maintain, and improve our services.</p>
                      <p><strong>3. Information Sharing</strong><br/>We do not share your personal information with third parties except as described in this privacy policy.</p>
                      <p><strong>4. Data Security</strong><br/>We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access.</p>
                      <p><strong>5. Your Choices</strong><br/>You may update, correct, or delete your account information at any time by logging into your online account.</p>
                      <p><strong>6. Contact Us</strong><br/>If you have any questions about this Privacy Policy, please contact us.</p>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Auth;
