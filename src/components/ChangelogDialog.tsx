import { History, Github, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export function ChangelogDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          title="View changelog and status"
        >
          <History className="h-4 w-4" />
          <span className="sr-only">Changelog</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Updates & Status
          </DialogTitle>
          <DialogDescription>
            Latest updates and system status for StudySpaceV2
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Latest Updates */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Latest Updates (v2.0)
            </h3>
            <div className="space-y-2 ml-6">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Glassmorphic Design System</p>
                  <p className="text-sm text-muted-foreground">All cards and components now feature frosted glass effect</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Enhanced Messaging</p>
                  <p className="text-sm text-muted-foreground">Multiline messages, typing indicators, and offline notifications</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Improved Inbox</p>
                  <p className="text-sm text-muted-foreground">Proper scroll handling, message grouping, and better organization</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Rich Text Formatting</p>
                  <p className="text-sm text-muted-foreground">Bold, italic, lists, headings, and code blocks in Notes & Tasks</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">AI Chat Redesign</p>
                  <p className="text-sm text-muted-foreground">Glassmorphic floating window with Sparkles icon and top-right positioning</p>
                </div>
              </div>
            </div>
          </div>

          {/* API Status */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">API & Server Status</h3>
            <div className="space-y-2 ml-6">
              <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <span className="font-medium">Supabase Database</span>
                <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <span className="font-medium">Supabase Real-time</span>
                <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <span className="font-medium">OpenRouter (AI)</span>
                <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <span className="font-medium">Frontend</span>
                <Badge variant="outline" className="bg-blue-500/20 text-blue-600 border-blue-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Deployed
                </Badge>
              </div>
            </div>
          </div>

          {/* Known Issues */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Known Limitations
            </h3>
            <div className="space-y-2 ml-6 text-sm text-muted-foreground">
              <p>• AI rate-limited to 1 message per 3 seconds</p>
              <p>• Messages stored per conversation (not globally archived)</p>
              <p>• Admin panel features still in development</p>
              <p>• Mobile responsiveness being enhanced</p>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-lg">Resources</h3>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open('https://github.com/AyaanplayszYT/studyspaceV2', '_blank')}
              >
                <Github className="h-4 w-4 mr-2" />
                View on GitHub
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open('https://github.com/AyaanplayszYT/studyspaceV2/releases', '_blank')}
              >
                <History className="h-4 w-4 mr-2" />
                Release History
              </Button>
            </div>
          </div>

          {/* Version Info */}
          <div className="pt-4 border-t text-sm text-muted-foreground">
            <p><strong>Version:</strong> 2.0.0</p>
            <p><strong>Last Updated:</strong> November 14, 2025</p>
            <p><strong>Status:</strong> Active Development</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
