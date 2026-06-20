# StudySpace V2 - Complete Student Platform

**All-in-one productivity and social platform for students with real-time features, AI assistance, and video calling.**

---

## Features

- **Notes & Tasks** - Rich text notes with file attachments, task management with due dates
- **Real-Time Chat** - General chat + private DMs with typing indicators
- **Video Calling** - Study rooms with WebRTC video/audio
- **Collaborative Whiteboard** - Draw together in real-time with multiple tools
- **AI Assistant** - GPT-3.5-Turbo powered chat (OpenRouter API)
- **Student Tests** - Create tests, auto-grading, teacher feedback
- **Pomodoro Timer** - Beautiful UI with session tracking
- **Gamification** - Leaderboards, points, streaks, rankings
- **Admin Panel** - Lock/unlock features, manage users
- **5 Themes** - Dark, Forest, Purple, and more
- **Friend System** - Add friends, discover users, see who's online

---

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui components
- Supabase (Database + Auth + Storage + Real-time)
- OpenRouter API for AI features
- WebRTC for video/audio calls

---

## Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables

Create `.env` file in root:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENROUTER_KEY=your_openrouter_key
```

### 3. Setup Supabase

**Create a project at [supabase.com](https://supabase.com)**

1. Get your URL and anon key from Settings → API
2. Go to SQL Editor
3. Copy and paste all contents from `supabase/full_schema.sql`
4. Click Run
5. Go to Database → Replication
6. Enable these tables:
   - `chat_messages`
   - `direct_messages`
   - `room_chat_messages`
   - `room_participants`
   - `webrtc_signals`
   - `settings`
   - `whiteboard_actions`

### 4. Setup OpenRouter

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Add $5-10 credits
3. Create API key in Keys section
4. Add to `.env` file

### 5. Run the App

```bash
npm run dev
```

Open `http://localhost:5173`

---

## Make Yourself Admin

After creating an account:

**Method 1:** Go to Supabase → Table Editor → `profiles` → Find your row → Set `is_admin` to `true`

**Method 2:** Run this SQL in Supabase SQL Editor:
```sql
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'your-email@example.com';
```

Access Admin Panel at `/admin`

---

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
npm i -g vercel
vercel
```
Add environment variables in Vercel dashboard, then deploy to production.

### Deploy to Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod
```

**Important:** Add your production URL to Supabase → Authentication → URL Configuration

---

## What's Included

- Complete React source code
- Full database schema (14 tables)
- All UI components and assets
- File upload system
- Real-time features
- Admin controls
- 5 theme system
- Comprehensive codebase

---

## � Configuration

### Database Tables
The schema creates:
- `profiles` - User accounts
- `notes` / `note_attachments` - Notes with files
- `tasks` / `task_attachments` - Task management
- `friendships` - Friend connections
- `direct_messages` / `chat_messages` - Messaging
- `study_rooms` / `room_participants` / `room_chat_messages` - Video rooms
- `webrtc_signals` - Video call signaling
- `whiteboard_actions` - Collaborative whiteboard
- `tests` / `test_questions` / `test_submissions` / `test_answers` - Assessment
- `settings` - Admin controls

### Storage Buckets
- `avatars` - Profile pictures (5MB)
- `note-attachments` - Note files (10MB)
- `task-attachments` - Task files (10MB)

---

## Quick Tips

- Use Admin Panel to lock features (Notes, Tasks, Chat, AI, Whiteboard)
- File size limits: 5MB for avatars, 10MB for attachments
- AI rate limit: 1 message per 3 seconds
- Video works best on Chrome/Edge
- All data secured with Row Level Security

---

## Common Issues

**"Can't connect to Supabase"**
- Check `.env` variables are correct
- Restart dev server after changing `.env`

**"Tables not found"**
- Run `full_schema.sql` in Supabase SQL Editor

**"AI not responding"**
- Verify OpenRouter API key
- Check account has credits

**"Video not working"**
- Allow camera/mic permissions in browser
- Use Chrome or Edge

---

## Costs

**Free Tier (Great for testing):**
- Supabase: 500MB DB, 1GB storage
- Vercel: Free hosting with 100GB bandwidth
- OpenRouter: ~$0.05 per 1,000 AI messages

**Estimated monthly costs for production:**
- 50 users: $0-10/month
- 500 users: $25-50/month
- 5000+ users: $100-300/month

---

## Requirements

- Node.js 16+
- Supabase account (free tier works)
- OpenRouter account (add $5-10 credits)
- Basic React/TypeScript knowledge

---

## Security

- All tables have Row Level Security (RLS)
- Users can only access their own data
- Environment variables for all secrets
- File size limits enforced
- Secure authentication with Supabase Auth

---

## License

MIT License - Use commercially, modify freely, no attribution required.

---

## Quick Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

---

## � Support

If you need help:
1. Check this README
2. Review code comments
3. Check Supabase docs: [docs.supabase.com](https://docs.supabase.com)
4. Contact via BuiltByBit
5. Contact us on Disocord
---

**Version:** 2.5.0  
**Last Updated:** June 2026  
**Status:** Production Ready

Built with React 18, TypeScript, Supabase, and modern web technologies.
