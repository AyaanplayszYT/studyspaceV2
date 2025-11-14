
# StudySpaceV2

**StudySpaceV2** is an upgraded all-in-one productivity and social platform for students.  
It combines AI-powered tools, real-time communication, and gamified learning to make studying fun and interactive.

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/AyaanplayszYT/studyspaceV2.git
cd studyspaceV2
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root directory with the following:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Start the development server
```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or as shown in your terminal).

---

## Database Setup

- This project uses Supabase for authentication, database, and real-time features.
- Run the SQL in `supabase/full_schema.sql` on your Supabase project to set up tables and policies.
- Make sure to create the `get_dm_conversations` function for DMs (see codebase or ask for SQL).

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License

MIT

## Features

###  Social & Chat
- **Add Friends** — connect with other students and grow your circle.  
- **Live Chats & DMs** — chat with friends in real-time with smooth, responsive messaging.  
- **AI Dynamic Island** — an interactive floating assistant that helps you while you study.

###  Productivity Tools
- **Create Notes** — easily organize and store your study notes.  
- **AI Chats** — get instant help, summaries, or explanations from the built-in AI.  
- **Streak System** — stay consistent and keep your study streak alive.  
- **Points & Rewards** — earn points for productivity and unlock rewards.

### 🛠️ Admin Panel
- Manage users, chat moderation, and community controls with a secure admin dashboard.

---

##  Tech Stack

- **Frontend:** React + Tailwind CSS  
- **Backend:** Supabase  
- **AI Integration:** OpenAI / Gemini (optional)  
- **Authentication:** Supabase Auth  
- **Real-time:** Supabase Realtime API  
- **Hosting:** Vercel / Netlify  

---

