# SocialConnect

A modern real-time social media platform built with React, Express, MongoDB, and WebSockets.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- MongoDB database (optional for development)

### Installation

1. **Install all dependencies:**
   ```bash
   npm run setup
   ```
   
   This will install dependencies in all modules:
   - Root workspace
   - Authentication module
   - Backend API server  
   - Frontend React app
   - Shared utilities

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   - `MONGODB_URL` - Your MongoDB connection string
   - `EMAIL_USER` & `EMAIL_PASSWORD` - For sending verification emails
   - `JWT_SECRET` & `REFRESH_TOKEN_SECRET` - For authentication

3. **Start development servers:**
   ```bash
   npm run dev
   ```
   
   This starts:
   - Backend API server on `http://localhost:5000`
   - Frontend React app on `http://localhost:3000`
   - WebSocket server for real-time features
   - MongoDB connection (if configured)

## 📁 Project Structure

```
socialconnect/
├── authentication/          # Authentication module
│   ├── auth.ts             # Core authentication logic
│   ├── middleware.ts       # Auth middleware
│   ├── routes.ts          # Auth API routes
│   └── package.json       # Auth dependencies
├── backend/                # Backend API server
│   ├── index.ts           # Main server entry
│   ├── routes.ts          # API routes
│   ├── db.ts             # Database connection
│   └── package.json      # Backend dependencies
├── frontend/              # React frontend app
│   ├── src/              # React source code
│   ├── index.html        # HTML template
│   ├── vite.config.ts    # Vite configuration
│   └── package.json      # Frontend dependencies
├── shared/               # Shared utilities
│   ├── mongoService.ts   # Database service layer
│   ├── emailService.ts   # Email service
│   ├── mongoSchemas.ts   # Data models
│   └── package.json      # Shared dependencies
└── package.json          # Root workspace config
```

## 🛠️ Development Commands

- `npm run setup` - Install all dependencies
- `npm run dev` - Start all development servers
- `npm run build:all` - Build all modules
- `npm run clean` - Clean all node_modules

### Individual Module Commands

**Authentication:**
```bash
cd authentication
npm install
npm run dev
```

**Backend:**
```bash
cd backend  
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install  
npm run dev
```

**Shared:**
```bash
cd shared
npm install
npm run build
```

## 🌟 Features

- **Real-time messaging** with WebSockets
- **User authentication** with JWT tokens
- **Email verification** with OTP codes
- **Social features** (posts, comments, likes, follows)
- **Responsive design** with Tailwind CSS
- **Modern React** with hooks and TypeScript
- **MongoDB integration** with proper schemas
- **Modular architecture** for easy maintenance

## 🔧 Configuration

### Database Setup
1. Create a MongoDB database (MongoDB Atlas recommended)
2. Add connection string to `.env` file
3. The app will automatically create indexes and collections

### Email Setup  
1. Configure email service in `.env`:
   - Gmail: Use app-specific password
   - Outlook: Use account password
2. Email verification will work automatically

### Environment Variables
See `.env.example` for all available configuration options.

## 🚀 Deployment

### Build for Production
```bash
npm run build:all
```

### Start Production Server
```bash
npm start
```

The production build serves both API and frontend from the backend server.

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Social Features
- `GET /api/posts` - Get user feed
- `POST /api/posts` - Create new post
- `POST /api/posts/:id/like` - Like/unlike post
- `POST /api/posts/:id/comments` - Add comment
- `POST /api/users/:id/follow` - Follow/unfollow user

### Real-time Features
- WebSocket connection at `/ws`
- Real-time posts, comments, likes
- Live messaging with typing indicators
- Activity notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes in the appropriate module
4. Test your changes
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.