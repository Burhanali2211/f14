# Sacred Recitations Hub (f14)

A comprehensive, high-performance platform dedicated to the preservation and distribution of religious recitations (Ahlul Bayt). Built with a modern tech stack focused on speed, SEO, and a seamless user experience across all devices.

## 🚀 Key Features

### 📖 Content Exploration
- **Categorized Browsing:** Easily navigate through various recitation categories and genres.
- **Ahlul Bayt Hub:** Dedicated pages for holy figures with associated recitations and biographical information.
- **Artist & Reciter Profiles:** Comprehensive lists and individual pages for reciters.
- **Advanced Search:** Find specific pieces, artists, or categories quickly.

### 🎧 Enhanced Reading & Playback
- **Synchronized Reading:** Track your reading progress across different pieces.
- **Personalized Experience:** Adjust font sizes, themes (Light/Dark), and accessibility settings.
- **Favorites:** Save your favorite recitations for quick access later.

### 📱 Progressive Web App (PWA)
- **Installable:** Add to your home screen on iOS and Android for a native app-like experience.
- **Offline Access:** Access previously viewed content even without an internet connection.
- **Real-time Notifications:** Receive announcements for new uploads and important religious dates.

### 🛠️ Powerful Admin & Uploader Tools
- **Bulk Uploading:** Streamlined process for adding multiple recitations at once.
- **AI-Enhanced Processing:** Leverages Hugging Face AI models for content enhancement and categorization.
- **Site Management:** Full control over categories, holy figures, artists, and global site settings.
- **Announcement System:** Send real-time updates to all users via Supabase Realtime and Push Notifications.

### ⚡ Performance & SEO
- **Blazing Fast:** Optimized with lazy loading, component virtualization, and advanced data caching.
- **SEO Optimized:** Automated sitemaps, structured data, and metadata management for maximum visibility.
- **Analytics:** Integrated reporting for content performance and user engagement.

## 🛠️ Tech Stack

- **Frontend:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- **State Management:** [TanStack Query (React Query)](https://tanstack.com/query/latest)
- **Backend & Auth:** [Supabase](https://supabase.com/) (Auth, Database, Edge Functions, Storage)
- **AI Integration:** [Hugging Face](https://huggingface.co/)
- **PWA:** [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- **PDF Handling:** jsPDF & pdfjs-dist
- **Icons:** [Lucide React](https://lucide.dev/)

## 🏁 Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (or Node.js/npm)
- Supabase account and project

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Set up your environment variables in a `.env` file (see `.env.example` if available or check existing environment setup):
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   HUGGINGFACE_API_KEY=your_hf_key
   ```
4. Start the development server:
   ```bash
   bun run dev
   ```

## 📁 Project Structure

- `src/components/`: Reusable UI components and page sections.
- `src/pages/`: Main route components for the application.
- `src/hooks/`: Custom React hooks for state and side effects.
- `src/integrations/`: Third-party service clients (Supabase, etc.).
- `src/lib/`: Utility functions and shared logic.
- `supabase/`: Database migrations and Edge Functions.

## 📄 License

This project is private and intended for community use.
