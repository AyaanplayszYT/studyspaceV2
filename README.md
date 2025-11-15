# StudySpaceV2

**An all-in-one productivity and social platform for students** with real-time communication, AI assistance, and gamified learning.

---

## 🚀 Recent Updates (v2.1)

### Notes Page - Major Enhancements
✅ **Clickable Note Cards** - Click on any note to open detailed view  
✅ **Detail Modal View** - Expanded view with full note content without truncation  
✅ **Multi-line Text Support** - Text properly wraps to multiple lines  
✅ **Visual Indicator** - "Click to view more context" with chevron icon  
✅ **Subtitle Wrapping** - Subtitles wrap to multiple lines instead of truncating  
✅ **Custom Markdown Formatting** - All formatting reliably displays (bold, italic, underline, code, headings, lists)  
✅ **Creator-Only Delete** - Only note creators can delete notes  
✅ **Improved Layout** - Better header layout with proper text wrapping  
✅ **White Text Styling** - Consistent white text with proper font weights  

### Tasks Page - Permissions
✅ **Creator-Only Delete** - Only task creators can delete tasks  
✅ **Permission System** - User-based access control  

### Previous Updates (v2.0)

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

## 🐛 Bug Fixes & Verification (v2.1)

✅ **Text Overflow Fixed** - Note content no longer overflows card boundaries  
✅ **Formatting Display Fixed** - All markdown formatting displays properly  
✅ **Subtitle Cutoff Fixed** - Subtitle text fully visible in cards  
✅ **Multi-line Support** - Text wraps correctly in all sections  
✅ **Permission System** - Creator-only delete functionality  
✅ **Layout Issues Fixed** - Better header layout with proper flex distribution  
✅ **Type Definitions** - user_id added to Note and Task interfaces  

### Previous Fixes (v2.0)
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

### 4. Set up the database
- This project uses **Supabase** for authentication, database, and real-time features
- Run the SQL in `supabase/full_schema.sql` on your Supabase project
- Tables included: profiles, friendships, direct_messages, notes, tasks, settings
- Real-time subscriptions enabled for instant updates

### 5. Make yourself admin
After running the schema SQL and creating an account:
1. Go to your Supabase dashboard
2. Open the SQL Editor
3. Run this query to make yourself admin:

```sql
UPDATE public.profiles SET is_admin = true WHERE id = 'your-user-id';
```

Replace `'your-user-id'` with your actual user ID from the `profiles` table.


### SIMPLER WAY 
 1. HEAD OVER TO TABLES > PROFILES > is_admin 
 2. Click on your row and then edit table.
 3. set as TRUE
![alt text](image.png)

4. You can now access the Admin Panel at `/admin` to:
   - Lock/unlock Notes (only admins can post when locked)
   - Lock/unlock AI Chat (only admins can use when locked)
   - Lock/unlock General Chat (all users locked out when enabled)
   - Lock/unlock Tasks (only admins can create when locked)
   - Manage other admin users (add/remove by email)

### 6. Start the development server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

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
- Admin features require direct database access to grant initial admin role

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License

MIT

---

**Last Updated:** November 15, 2025  
**Version:** 2.1.0  
**Status:** Active Development
