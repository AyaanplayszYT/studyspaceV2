import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Settings, Coffee, Brain, Clock } from 'lucide-react';

type TimerMode = 'work' | 'break' | 'longBreak';

interface TimerSettings {
  workDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
}

// Circular progress ring component
const CircularProgress = ({ 
  progress, 
  size = 400, 
  strokeWidth = 12,
  color,
  children 
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  color: string;
  children?: React.ReactNode;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted opacity-10"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear drop-shadow-lg"
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default function PomodoroTimer() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<TimerSettings>({
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
  });

  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [editingSettings, setEditingSettings] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sound notification
  const playSound = () => {
    if (isSoundOn && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Fallback: use Web Audio API
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.5);
      });
    }
  };

  // Timer logic
  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          handleTimerEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const handleTimerEnd = () => {
    playSound();
    setIsRunning(false);

    if (mode === 'work') {
      setSessionsCompleted((prev) => prev + 1);

      const nextMode =
        (sessionsCompleted + 1) % settings.sessionsBeforeLongBreak === 0 ? 'longBreak' : 'break';

      toast({
        title: `${mode === 'work' ? 'Work Session Complete!' : 'Break Over!'}`,
        description: `Get ready for ${nextMode === 'longBreak' ? 'a long break' : 'a break'}`,
      });

      setMode(nextMode);
      setTimeLeft(
        nextMode === 'break'
          ? settings.breakDuration * 60
          : settings.longBreakDuration * 60
      );
    } else {
      toast({
        title: 'Break Over!',
        description: 'Ready for another work session?',
      });

      setMode('work');
      setTimeLeft(settings.workDuration * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    setMode('work');
    setTimeLeft(settings.workDuration * 60);
    setSessionsCompleted(0);
    toast({
      title: 'Timer Reset',
      description: 'All sessions cleared',
    });
  };

  const handleSettingChange = (key: keyof TimerSettings, value: number) => {
    const newSettings = { ...settings, [key]: Math.max(1, value) };
    setSettings(newSettings);

    if (mode === 'work') {
      setTimeLeft(newSettings.workDuration * 60);
    } else if (mode === 'break') {
      setTimeLeft(newSettings.breakDuration * 60);
    } else {
      setTimeLeft(newSettings.longBreakDuration * 60);
    }
  };

  const getModeColor = () => {
    switch (mode) {
      case 'work':
        return {
          gradient: 'from-blue-500 via-blue-600 to-indigo-600',
          ring: '#3b82f6',
          bg: 'bg-blue-500/10',
          text: 'text-blue-500'
        };
      case 'break':
        return {
          gradient: 'from-green-500 via-emerald-600 to-teal-600',
          ring: '#10b981',
          bg: 'bg-green-500/10',
          text: 'text-green-500'
        };
      case 'longBreak':
        return {
          gradient: 'from-purple-500 via-violet-600 to-fuchsia-600',
          ring: '#a855f7',
          bg: 'bg-purple-500/10',
          text: 'text-purple-500'
        };
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'work':
        return 'Focus Time';
      case 'break':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'work':
        return <Brain className="w-8 h-8" />;
      case 'break':
        return <Coffee className="w-8 h-8" />;
      case 'longBreak':
        return <Clock className="w-8 h-8" />;
    }
  };

  const getTotalSeconds = () => {
    switch (mode) {
      case 'work':
        return settings.workDuration * 60;
      case 'break':
        return settings.breakDuration * 60;
      case 'longBreak':
        return settings.longBreakDuration * 60;
    }
  };

  const getProgress = () => {
    const total = getTotalSeconds();
    return ((total - timeLeft) / total) * 100;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Pomodoro Timer
        </h1>
        <p className="text-muted-foreground">
          Stay focused with the Pomodoro Technique
        </p>
      </div>

      {/* Main Timer Display with Circular Ring */}
      <div className="flex justify-center items-center py-8">
        <div className="relative">
          <CircularProgress 
            progress={getProgress()} 
            size={420}
            strokeWidth={16}
            color={getModeColor().ring}
          >
            <div className="text-center space-y-4">
              {/* Mode Icon */}
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getModeColor().bg} ${getModeColor().text} mb-2`}>
                {getModeIcon()}
              </div>
              
              {/* Timer Display */}
              <div>
                <div className="text-7xl font-bold font-mono tracking-tight mb-2">
                  {formatTime(timeLeft)}
                </div>
                <div className={`text-lg font-semibold ${getModeColor().text}`}>
                  {getModeLabel()}
                </div>
              </div>

              {/* Session Counter */}
              <div className="flex items-center justify-center gap-2 pt-4">
                {[...Array(settings.sessionsBeforeLongBreak)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      i < sessionsCompleted % settings.sessionsBeforeLongBreak
                        ? getModeColor().text + ' opacity-100 scale-110'
                        : 'bg-muted opacity-40'
                    }`}
                  />
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                {sessionsCompleted} session{sessionsCompleted !== 1 ? 's' : ''} completed
              </div>
            </div>
          </CircularProgress>
        </div>
      </div>

      {/* Controls */}
      <Card className="shadow-lg border-0">
        <CardContent className="pt-6">
          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              size="lg"
              onClick={() => setIsRunning(!isRunning)}
              className={`px-8 text-lg h-14 transition-all duration-300 ${
                isRunning
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-500/50'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/50'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Start
                </>
              )}
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={handleReset}
              className="px-8 text-lg h-14 hover:bg-muted"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Reset
            </Button>

            <Button
              size="lg"
              variant="ghost"
              onClick={() => setIsSoundOn(!isSoundOn)}
              className={`px-6 h-14 transition-colors ${
                isSoundOn ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {isSoundOn ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </Button>

            <Button
              size="lg"
              variant="ghost"
              onClick={() => setEditingSettings(!editingSettings)}
              className="px-6 h-14"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Switch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={() => {
                setMode('work');
                setTimeLeft(settings.workDuration * 60);
                setIsRunning(false);
              }}
              variant={mode === 'work' ? 'default' : 'outline'}
              className={`w-full h-20 flex flex-col gap-2 transition-all ${
                mode === 'work' 
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30' 
                  : 'hover:border-blue-500'
              }`}
            >
              <Brain className="w-5 h-5" />
              <span className="text-sm">Focus</span>
            </Button>
            <Button
              onClick={() => {
                setMode('break');
                setTimeLeft(settings.breakDuration * 60);
                setIsRunning(false);
              }}
              variant={mode === 'break' ? 'default' : 'outline'}
              className={`w-full h-20 flex flex-col gap-2 transition-all ${
                mode === 'break' 
                  ? 'bg-gradient-to-br from-green-500 to-teal-600 shadow-lg shadow-green-500/30' 
                  : 'hover:border-green-500'
              }`}
            >
              <Coffee className="w-5 h-5" />
              <span className="text-sm">Break</span>
            </Button>
            <Button
              onClick={() => {
                setMode('longBreak');
                setTimeLeft(settings.longBreakDuration * 60);
                setIsRunning(false);
              }}
              variant={mode === 'longBreak' ? 'default' : 'outline'}
              className={`w-full h-20 flex flex-col gap-2 transition-all ${
                mode === 'longBreak' 
                  ? 'bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-lg shadow-purple-500/30' 
                  : 'hover:border-purple-500'
              }`}
            >
              <Clock className="w-5 h-5" />
              <span className="text-sm">Long Break</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      {editingSettings && (
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Customize Your Timer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="work-duration" className="text-base font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-500" />
                  Focus Duration
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="work-duration"
                    type="number"
                    min="1"
                    max="60"
                    value={settings.workDuration}
                    onChange={(e) => handleSettingChange('workDuration', parseInt(e.target.value))}
                    className="text-lg h-12"
                  />
                  <span className="text-muted-foreground min-w-[60px]">minutes</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="break-duration" className="text-base font-semibold flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-green-500" />
                  Short Break
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="break-duration"
                    type="number"
                    min="1"
                    max="30"
                    value={settings.breakDuration}
                    onChange={(e) => handleSettingChange('breakDuration', parseInt(e.target.value))}
                    className="text-lg h-12"
                  />
                  <span className="text-muted-foreground min-w-[60px]">minutes</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="long-break-duration" className="text-base font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  Long Break
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="long-break-duration"
                    type="number"
                    min="1"
                    max="60"
                    value={settings.longBreakDuration}
                    onChange={(e) => handleSettingChange('longBreakDuration', parseInt(e.target.value))}
                    className="text-lg h-12"
                  />
                  <span className="text-muted-foreground min-w-[60px]">minutes</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessions-before-long-break" className="text-base font-semibold">
                  Sessions Before Long Break
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="sessions-before-long-break"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.sessionsBeforeLongBreak}
                    onChange={(e) => handleSettingChange('sessionsBeforeLongBreak', parseInt(e.target.value))}
                    className="text-lg h-12"
                  />
                  <span className="text-muted-foreground min-w-[60px]">sessions</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!editingSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Brain className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-500">{settings.workDuration}</div>
                <div className="text-xs text-muted-foreground mt-1">Focus Time</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <Coffee className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-500">{settings.breakDuration}</div>
                <div className="text-xs text-muted-foreground mt-1">Short Break</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Clock className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-500">{settings.longBreakDuration}</div>
                <div className="text-xs text-muted-foreground mt-1">Long Break</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50 border border-muted">
                <div className="text-2xl font-bold">{settings.sessionsBeforeLongBreak}</div>
                <div className="text-xs text-muted-foreground mt-1">Sessions Until Long Break</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="text-lg">💡 Productivity Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="text-2xl">🔕</div>
              <div>
                <div className="font-semibold text-sm mb-1">Minimize Distractions</div>
                <div className="text-xs text-muted-foreground">
                  Put your phone on silent and close unnecessary tabs during focus sessions.
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="text-2xl">📊</div>
              <div>
                <div className="font-semibold text-sm mb-1">Track Your Progress</div>
                <div className="text-xs text-muted-foreground">
                  Monitor your completed Pomodoros to improve productivity over time.
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="text-2xl">🚶</div>
              <div>
                <div className="font-semibold text-sm mb-1">Use Breaks Wisely</div>
                <div className="text-xs text-muted-foreground">
                  Step away from your desk, stretch, and rest your eyes during breaks.
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="text-2xl">⚙️</div>
              <div>
                <div className="font-semibold text-sm mb-1">Customize for You</div>
                <div className="text-xs text-muted-foreground">
                  Adjust session lengths to match your focus patterns and work style.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hidden audio element for notification sound */}
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj=="
      />
    </div>
  );
}
