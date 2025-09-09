# NeuroNest - AI Development Community Platform

## Overview
NeuroNest is a comprehensive AI development community platform built with React, TypeScript, and Supabase. It provides a Reddit-style interface for AI developers and enthusiasts to share knowledge, discuss projects, and build community around AI development.

## Current State
- ✅ Successfully imported and configured for Replit environment
- ✅ React development server running on port 5000 with host configuration
- ✅ All TypeScript compilation issues resolved
- ✅ Supabase integration configured with environment variables
- ✅ Deployment configuration set up for autoscale hosting

## Recent Changes (September 2025)
- **SECURITY UPGRADE**: Implemented comprehensive secure multitenant SaaS authentication system
- Created enterprise-grade database schema with Row Level Security (RLS) policies for tenant isolation
- Added comprehensive input validation and sanitization with real-time feedback
- Implemented strong password requirements (8+ chars, mixed case, numbers, special chars)
- Added client-side rate limiting for signup (3/15min), signin (5/15min), verification (3/5min)
- Built email verification system with resend functionality and proper flow
- Enhanced authentication with proper error handling and user-friendly messages
- Added tenant isolation at database level with proper RLS policies
- Created validation utilities with security best practices and CSRF protection
- Improved AuthModal with real-time validation, cooldown timers, and enhanced UX

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
│   ├── AuthModal.tsx    # Secure login/signup modal with validation
│   ├── PostCard.tsx     # Individual post display
│   ├── CreatePostModal.tsx
│   └── CreateCommunityModal.tsx
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Secure authentication state management
├── lib/                 # Utilities and configuration
│   └── supabase.ts     # Supabase client and TypeScript interfaces
├── utils/               # Security utilities
│   └── validation.ts   # Input validation, sanitization, rate limiting
├── App.tsx             # Main application component
├── index.tsx           # Application entry point
└── supabase-schema.sql # Secure database schema with RLS policies
```

### Security Features Implemented
- **Row Level Security (RLS)**: Complete tenant isolation at database level
- **Input Validation**: Real-time validation with sanitization and XSS protection
- **Rate Limiting**: Client-side rate limiting for all auth operations
- **Email Verification**: Required email verification with resend functionality
- **Strong Password Policy**: 8+ chars, mixed case, numbers, special characters
- **Username Security**: Alphanumeric + underscore only, reserved name protection
- **Error Handling**: User-friendly error messages with security considerations
- **CSRF Protection**: Built-in token generation and validation utilities
- **Data Sanitization**: All inputs sanitized to prevent injection attacks

### Environment Configuration
- `REACT_APP_SUPABASE_URL`: Your Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY`: Supabase anonymous/public key
- Development server configured for Replit proxy compatibility
- **Database Setup**: Run `supabase-schema.sql` in your Supabase SQL editor to create secure tables

### Deployment
- **Target**: Autoscale deployment (stateless web application)
- **Build**: `npm run build` (creates optimized production build)
- **Runtime**: `serve` package serving static files on port 5000
- Ready for production deployment via Replit's publish feature