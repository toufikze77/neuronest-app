# NeuroNest - AI Development Community Platform

## Overview
NeuroNest is a comprehensive AI development community platform built with React, TypeScript, and Supabase. It provides a Reddit-style interface for AI developers and enthusiasts to share knowledge, discuss projects, and build community around AI development.

## Current State
- ✅ Successfully imported and configured for Replit environment
- ✅ React development server running on port 5000 with host configuration
- ✅ All TypeScript compilation issues resolved
- ✅ Supabase integration configured with environment variables
- ✅ Deployment configuration set up for autoscale hosting

## Recent Changes (January 2025)
- Created missing authentication context (AuthContext.tsx) with complete user management
- Set up Supabase client configuration with proper TypeScript interfaces
- Fixed React development server to bind to 0.0.0.0:5000 with host check disabled for Replit proxy
- Added proper environment variable handling for Supabase credentials
- Resolved all TypeScript compilation errors in components
- Installed and configured 'serve' package for production deployment

## User Preferences
- None specified yet

## Project Architecture

### Frontend Stack
- **React 19.1.1** with TypeScript for UI
- **Tailwind CSS 4.1.13** for styling (with CDN for development)
- **Lucide React** for icons
- **Create React App** as build system

### Backend & Database
- **Supabase** for authentication, database, and real-time features
- **PostgreSQL** database (via Supabase)
- RESTful API integration with Supabase client

### Key Features Implemented
1. **Authentication System**: Complete user registration, login, and session management
2. **Community Management**: Create and join AI development communities  
3. **Post System**: Reddit-style posts with voting, comments, and discussions
4. **User Profiles**: Karma system, streaks, and expert verification
5. **Leaderboards**: Community ranking and engagement tracking
6. **Responsive Design**: Mobile-first approach with dark theme

### Database Schema (Supabase Tables Expected)
- `profiles`: User profiles with karma, streaks, expert status
- `communities`: AI development communities 
- `posts`: User-generated content with voting
- `comments`: Nested comment system
- `votes`: Upvote/downvote tracking
- `community_members`: Community membership tracking

### File Structure
```
src/
├── components/          # React components
│   ├── AuthModal.tsx    # Login/signup modal
│   ├── PostCard.tsx     # Individual post display
│   ├── CreatePostModal.tsx
│   └── CreateCommunityModal.tsx
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication state management
├── lib/                 # Utilities and configuration
│   └── supabase.ts     # Supabase client and TypeScript interfaces
├── App.tsx             # Main application component
└── index.tsx           # Application entry point
```

### Environment Configuration
- `REACT_APP_SUPABASE_URL`: Your Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY`: Supabase anonymous/public key
- Development server configured for Replit proxy compatibility

### Deployment
- **Target**: Autoscale deployment (stateless web application)
- **Build**: `npm run build` (creates optimized production build)
- **Runtime**: `serve` package serving static files on port 5000
- Ready for production deployment via Replit's publish feature