# ChatHome Family

A mobile-first AI chat application for families, built with React and Cloudflare infrastructure.

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library (Radix UI primitives)
- **Lucide React** - Icon library
- **vite-plugin-pwa** - Progressive Web App support

### Backend
- **Cloudflare Workers** - Serverless API runtime
- **Hono** - Lightweight web framework
- **Cloudflare D1** - SQLite database
- **Cloudflare R2** - Object storage for file uploads
- **Zod** - Schema validation

### AI Integration
- **OpenAI API** - GPT-4.1-mini (fast) and o4-mini (thinking)
- **Vision API** - Image analysis capabilities
- **ScrapingDog** - Web search integration

---

## Features

### Authentication & Users

| Feature | Description |
|---------|-------------|
| JWT Authentication | Secure token-based auth with PBKDF2 password hashing |
| Role-based Access | Three roles: Admin, Adult, Kid |
| User Management | Admin can create users, reset passwords |
| Registration Control | Toggle public registration on/off |
| Personalized AI | AI addresses users by their username |

### Chat Capabilities

| Feature | Description |
|---------|-------------|
| Dual AI Modes | **Fast** (GPT-4.1-mini) for quick responses, **Thinking** (o4-mini) for complex reasoning |
| Streaming Responses | Real-time text streaming with typing effect |
| Stop Generation | Cancel AI response mid-stream |
| Conversation History | Persistent chat history per user |
| Auto-create Chat | New conversation created automatically on first message |
| Conversation Persistence | Selected conversation saved across page refreshes |

### File Attachments

| Format | Processing Method |
|--------|-------------------|
| Images (jpg, png, gif, webp, bmp, tiff, heic) | GPT Vision API (base64 encoded) |
| PDF | Text extraction via `unpdf` library |
| Word (.docx) | XML extraction via `JSZip` |
| Excel (.xlsx, .xls) | CSV conversion via `xlsx` library |
| Text/Code files | Direct text reading |

> **Note:** Images always use the Fast model (GPT-4.1-mini) regardless of selected mode for cost optimization.

### Web Search

- Integrated web search via ScrapingDog API
- Search results injected into AI context
- Toggle on/off per message

### UI/UX Features

| Feature | Description |
|---------|-------------|
| Dark/Light Mode | Theme toggle with system preference support |
| Mobile-first Design | Responsive layout optimized for phones |
| PWA Support | Installable on iOS and Android |
| Copy Messages | Hover to copy any message content |
| Delete Confirmation | Dialog prompt before deleting conversations |
| Sidebar Navigation | Collapsible conversation list |

### Kid-safe Mode

When user role is "Kid":
- Age-appropriate language enforcement
- Content filtering for adult topics
- Educational focus
- Inappropriate question redirection

---

## API Endpoints

### Authentication
```
POST /api/auth/register    - Register new user
POST /api/auth/login       - Login and get JWT token
GET  /api/auth/me          - Get current user info
POST /api/auth/logout      - Logout (invalidate token)
```

### Chat
```
GET  /api/chat/conversations           - List user's conversations
POST /api/chat/conversations           - Create new conversation
GET  /api/chat/conversations/:id       - Get conversation with messages
DELETE /api/chat/conversations/:id     - Delete conversation
PATCH /api/chat/conversations/:id      - Update conversation title
POST /api/chat/conversations/:id/messages - Send message (SSE streaming)
POST /api/chat/upload                  - Upload file attachment
GET  /api/chat/files/:key              - Get uploaded file
```

### Admin
```
GET  /api/admin/users              - List all users
GET  /api/admin/users/:id          - Get user details
POST /api/admin/users              - Create new user
PATCH /api/admin/users/:id/role    - Update user role
PATCH /api/admin/users/:id/password - Reset user password
DELETE /api/admin/users/:id        - Delete user
GET  /api/admin/stats              - Get system statistics
GET  /api/admin/settings           - Get system settings
PATCH /api/admin/settings          - Update settings
```

### Search
```
POST /api/search/web    - Perform web search
```

---

## Database Schema

### Users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'adult',  -- 'admin', 'adult', 'kid'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Conversations
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Messages
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,           -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  model TEXT,                   -- 'fast', 'thinking'
  attachments TEXT,             -- JSON array of R2 keys
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

### Settings
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Environment Variables

### Worker (wrangler.toml)
```toml
[vars]
OPENAI_API_KEY = "sk-..."
SCRAPINGDOG_API_KEY = "..."
JWT_SECRET = "..."

[[d1_databases]]
binding = "DB"
database_name = "chathome"
database_id = "..."

[[r2_buckets]]
binding = "FILES"
bucket_name = "chathome-files"
```

### Frontend (.env)
```env
VITE_API_URL=https://chathome-api.your-domain.workers.dev
```

---

## Deployment

### Frontend (Cloudflare Pages)
```bash
npm run build
npx wrangler pages deploy dist --project-name chathome-family
```

### Backend (Cloudflare Workers)
```bash
cd workers
npx wrangler deploy
```

### Database Migration
```bash
cd workers
npm run db:migrate:prod
```

---

## Project Structure

```
chathome/
├── src/
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatInput.tsx      # Message input with file upload
│   │   │   ├── ChatWindow.tsx     # Main chat container
│   │   │   ├── MessageBubble.tsx  # Individual message display
│   │   │   ├── MessageList.tsx    # Scrollable message list
│   │   │   └── ModelSelector.tsx  # Fast/Thinking mode toggle
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   │   └── ConversationList.tsx
│   │   └── ui/                    # shadcn/ui components
│   ├── contexts/
│   │   └── AuthContext.tsx        # Authentication state
│   ├── hooks/
│   │   ├── useChat.ts             # Chat state management
│   │   └── useConversations.ts    # Conversation CRUD
│   ├── lib/
│   │   ├── api.ts                 # API client
│   │   └── utils.ts               # Utilities
│   └── pages/
│       ├── ChatPage.tsx           # Main chat page
│       ├── LoginPage.tsx          # Login/Register
│       └── AdminPage.tsx          # Admin dashboard
├── workers/
│   └── src/
│       ├── routes/
│       │   ├── auth.ts            # Auth endpoints
│       │   ├── chat.ts            # Chat endpoints
│       │   ├── admin.ts           # Admin endpoints
│       │   └── search.ts          # Search endpoints
│       ├── lib/
│       │   ├── openai.ts          # OpenAI integration
│       │   └── search.ts          # Web search
│       ├── middleware/
│       │   └── auth.ts            # JWT middleware
│       └── index.ts               # Worker entry
├── public/
│   └── aichatlogo.jpg             # App logo
├── index.html
├── vite.config.ts
└── package.json
```

---

## PWA Configuration

- **iOS Support**: Full meta tags for Add to Home Screen
- **Manifest**: App name, icons, theme colors
- **Service Worker**: Precaching for offline support
- **Status Bar**: Black translucent style on iOS

---

## Security Features

- PBKDF2 password hashing (100,000 iterations)
- JWT token authentication
- Role-based access control
- Input validation with Zod schemas
- CORS configuration
- Secure file upload handling

---

## Mobile App

A React Native mobile app is available in the `/mobile` directory.

### Tech Stack
- React Native with Expo (SDK 52)
- Expo Router for navigation
- TypeScript

### Quick Start
```bash
cd mobile
npm install
npm start
```

### Building for Android
```bash
# Preview APK
eas build --platform android --profile preview

# Production App Bundle
eas build --platform android --profile production
```

### Opening in Android Studio
```bash
npx expo prebuild --platform android
# Then open mobile/android in Android Studio
```

See [mobile/README.md](./mobile/README.md) for full documentation.

---

## License

Private - All rights reserved.
