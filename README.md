# UI4RAG - RAG Content Management Interface

A beautiful, Notion-inspired interface for managing your RAG (Retrieval-Augmented Generation) content.

## Features

- 🎨 Clean, Notion-inspired UI
- 🔐 Supabase authentication with OTP
- 📊 Multiple content sources (Text, Website, Docs, Q&A, Notion)
- 🗄️ Connect your own vector database (PostgreSQL/pgvector)
- 🤖 AI embeddings configuration (OpenAI)
- 📱 Mobile-friendly responsive design

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings > API
3. Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Configure Supabase Email Templates (Optional)

For OTP emails to work properly, configure your email templates in Supabase:
- Go to Authentication > Email Templates
- Customize the "Confirm signup" template

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
app/
├── page.tsx              # Landing page
├── signin/page.tsx       # Sign in page
├── signup/page.tsx       # Sign up page with OTP
├── pricing/page.tsx      # Pricing page
├── app/
│   ├── page.tsx          # RAG dashboard
│   ├── [id]/
│   │   ├── config/       # Configuration page
│   │   ├── profile/      # User profile
│   │   └── sources/      # Content sources (text, website, docs, qa, notion)
│   └── layout.tsx        # App layout with sidebar
├── components/
│   └── Sidebar.tsx       # Navigation sidebar
└── lib/
    └── supabase.ts       # Supabase client configuration
```

## Configuration

### Vector Database

1. Create a PostgreSQL database with pgvector extension (Supabase includes this by default)
2. Run the SQL provided in the Config page to create the required table
3. Add your connection string in the Config page

### AI Embeddings

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Choose your embedding model and dimensions
3. Add your API key in the Config page

## Authentication Flow

1. **Sign Up**: User enters email and password
2. **OTP Sent**: Verification code sent to email
3. **Verify**: User enters 6-digit code
4. **Complete**: Redirect to sign in page
5. **Sign In**: User can now access the app

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Authentication**: Supabase Auth with OTP
- **Database**: PostgreSQL with pgvector (user-provided)
- **AI**: OpenAI Embeddings API (user-provided)

## Notes

- The proxy for Supabase auth is configured in `next.config.ts` using rewrites
- All user data stays in the user's own database
- This is a UI-only application - no backend data storage

## License

MIT
