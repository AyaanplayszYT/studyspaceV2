import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/DashboardLayout";
import { useThemeManager } from "./hooks/use-theme-manager";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Notes from "./pages/Notes";
import Tasks from "./pages/Tasks";
import Chat from "./pages/Chat";
import Leaderboard from "./pages/Leaderboard";
import Inbox from "./pages/Inbox";
import NotFound from "./pages/NotFound";
import AIChat from "./pages/AIChat";
import AdminPanel from "./pages/AdminPanel";
import DMChat from "./pages/DMChat";
import DMList from "./pages/DMList";
import UserDiscovery from "./pages/UserDiscovery";
import PublicProfiles from "./pages/PublicProfiles";
import StudyRooms from "./pages/StudyRooms";
import StudyRoom from "./pages/StudyRoom";
import PomodoroTimer from "./pages/PomodoroTimer";
import Whiteboard from "./pages/Whiteboard";

const queryClient = new QueryClient();

// Theme initializer component to ensure theme is applied at app root
const ThemeInitializer = ({ children }: { children: React.ReactNode }) => {
  useThemeManager(); // This initializes and applies the theme
  return <>{children}</>;
};

const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <ThemeInitializer>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Settings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notes"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Notes />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Tasks />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Chat />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Leaderboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/community"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PublicProfiles />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inbox"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Inbox />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-chat"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AIChat />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AdminPanel />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dms"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DMList />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dms/:userId"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DMChat />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <UserDiscovery />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/study-rooms"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <StudyRooms />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/study-room/:roomId"
              element={
                <ProtectedRoute>
                  <StudyRoom />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pomodoro"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PomodoroTimer />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/whiteboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Whiteboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeInitializer>
  </QueryClientProvider>
  );
};

export default App;
