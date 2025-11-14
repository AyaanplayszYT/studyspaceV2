# StudySpaceV2

**An all-in-one productivity and social platform for students** with real-time communication, AI assistance, and gamified learning.

---

## 🚀 Recent Updates (v2.0)

### Inbox Page
✅ Scroll features for all tabs (Discover Friends, Pending Messages, Friends, Messages)  
✅ Messages tab shows "sent a message when you were away" notification  
✅ Message notifications disappear when clicked  
✅ Typing indicators with animated dots  
✅ Multiline message support (Enter to send, Shift+Enter for new line)  
✅ Proper whitespace preservation with `whitespace-pre-wrap`  
✅ Page scroll lock to prevent overflow  
✅ Real-time presence indicators  

### AI Chat Component (v1.5)
✅ Redesigned with glassmorphic style  
✅ Sparkles icon (changed from message icon)  
✅ Purple-to-pink gradient for modern look  
✅ Positioned in top right corner  
✅ Draggable window with smooth interactions  
✅ Multiline support with formatting  

### Global Updates
✅ All cards updated with glassmorphism styling  
✅ Formatting toolbar added to Notes  
✅ Formatting toolbar added to Tasks  
✅ Support for markdown in both  

### Formatting Options
✅ **Bold** - `**text**`  
✅ *Italic* - `*text*`  
✅ __Underline__ - `__text__`  
✅ Lists - `- item`  
✅ Headings - `# Heading`, `## Subheading`  
✅ Code - `` `code` ``  

---

## 🐛 Bug Fixes & Verification

✅ **No TypeScript Errors** - All files compile successfully  
✅ **Proper Type Definitions** - All interfaces properly defined  
✅ **State Management** - Clean state handling with useCallback and useMemo  
✅ **Real-time Sync** - Supabase subscriptions working correctly  
✅ **Responsive Design** - Tested layout constraints  
✅ **Message Formatting** - Whitespace and line breaks preserved  
✅ **Error Handling** - Toast notifications for errors  
✅ **Component Refs** - Proper ref usage for scrolling and DOM manipulation  

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
VITE_OPENROUTER_KEY=your_openrouter_api_key
```

### 4. Start the development server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

---

## Database Setup

- This project uses **Supabase** for authentication, database, and real-time features
- Run the SQL in `supabase/full_schema.sql` on your Supabase project
- Tables included: profiles, friendships, direct_messages, notes, tasks
- Real-time subscriptions enabled for instant updates

---

## 📚 Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **AI Integration:** OpenRouter API (OpenAI GPT-3.5-turbo)
- **Authentication:** Supabase Auth
- **Real-time:** Supabase Realtime
- **Markdown:** React Markdown with Syntax Highlighting
- **Icons:** Lucide React
- **Hosting:** Vercel / Netlify

---

## 🎯 Known Limitations

- AI rate-limited to 1 message per 3 seconds
- Messages stored per conversation (not globally archived)
- Admin panel features still in development

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License

MIT

---

**Last Updated:** November 14, 2025  
**Version:** 2.0.0  
**Status:** Active Development
