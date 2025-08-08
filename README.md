# HomeChat - AI Chat Assistant

A modern, mobile-first AI chat application built with Next.js, React, and Supabase. HomeChat provides a ChatGPT-like experience with user authentication, chat history, and file upload capabilities.

## Features

- 🤖 **AI Chat Interface** - Powered by OpenAI with configurable models
- 📱 **Mobile-First Design** - Responsive design optimized for mobile devices
- 🔐 **User Authentication** - Secure authentication with Supabase
- 💾 **Chat History** - Persistent chat history for logged-in users
- 📎 **File Attachments** - Support for images, documents, and other files
- 🌙 **Dark Theme** - Beautiful dark theme interface
- ⚡ **Real-time Updates** - Instant message updates and responses
- 🔒 **Secure** - Row-level security and proper authentication

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **AI**: OpenAI API
- **File Storage**: Supabase Storage
- **Deployment**: Netlify

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd homechat
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL_NAME=gpt-4

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Supabase Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Copy your project URL and anon key

2. **Run Database Schema**
   - Go to your Supabase dashboard
   - Navigate to the SQL editor
   - Run the contents of `supabase/schema.sql`

3. **Create Storage Bucket**
   - In your Supabase dashboard, go to Storage
   - Create a new bucket called `attachments`
   - Set the bucket to public

4. **Configure RLS Policies**
   - The schema includes RLS policies, but verify they're working correctly
   - Test the policies in the Supabase dashboard

### 5. OpenAI Setup

1. **Get API Key**
   - Go to [platform.openai.com](https://platform.openai.com)
   - Create an account and get your API key
   - Add it to your `.env.local` file

2. **Configure Model**
   - Set your preferred model in the `OPENAI_MODEL_NAME` environment variable
   - Default is `gpt-4`

### 6. Run the Application

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
homechat/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── AuthModal.tsx      # Authentication modal
│   ├── ChatInterface.tsx  # Main chat interface
│   ├── FileUpload.tsx     # File upload component
│   ├── Header.tsx         # Header component
│   └── MessageComponent.tsx # Message display component
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication context
├── lib/                   # Utility libraries
│   ├── supabase.ts        # Supabase client
│   ├── supabase-server.ts # Server-side Supabase client
│   └── utils.ts           # Utility functions
├── types/                 # TypeScript types
│   └── index.ts           # Type definitions
├── supabase/              # Database schema
│   └── schema.sql         # Supabase schema
└── middleware.ts          # Next.js middleware
```

## Deployment

### Netlify Deployment

1. **Connect to Netlify**
   - Push your code to GitHub
   - Connect your repository to Netlify

2. **Environment Variables**
   - Add all environment variables in Netlify dashboard
   - Ensure all required variables are set

3. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`

4. **Deploy**
   - Netlify will automatically deploy on push to main branch

## Usage

### For Users

1. **Start Chatting**
   - Visit the application
   - Start typing to begin a conversation
   - No authentication required for basic usage

2. **Save Chat History**
   - Sign up or sign in to save your chat history
   - All chats are automatically saved for logged-in users

3. **Upload Files**
   - Click the attachment button to upload files
   - Supported formats: images, PDFs, text files
   - Files are analyzed by the AI for context

4. **Create New Chats**
   - Click "New Chat" to start a fresh conversation
   - Previous chats are preserved in the sidebar

### For Developers

1. **Adding Features**
   - Follow the existing component structure
   - Use TypeScript for type safety
   - Follow the established styling patterns

2. **API Development**
   - Add new routes in `app/api/`
   - Use the server-side Supabase client
   - Implement proper error handling

3. **Database Changes**
   - Update the schema in `supabase/schema.sql`
   - Test changes in development first
   - Update types in `types/index.ts`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the GitHub repository or contact the development team. 