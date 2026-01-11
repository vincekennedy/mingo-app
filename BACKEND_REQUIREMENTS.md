# Backend Requirements for Cross-Device Multiplayer

## Overview
To enable true cross-device multiplayer for Mingo, we need to move from client-side `localStorage` to a backend server that can handle shared game state across all devices and browsers.

## Core Requirements

### 1. **Backend API Server**
- RESTful API endpoints for game management
- Real-time updates (WebSocket or Server-Sent Events)
- Authentication & authorization
- Game state persistence

### 2. **Database**
- Store game configurations
- Store user accounts (with proper password hashing)
- Store board states per user per game
- Store win claims and verification status
- Handle concurrent updates

### 3. **Authentication System**
- User registration/login with secure password hashing (bcrypt)
- JWT tokens or session management
- User association with games

### 4. **Real-Time Synchronization**
- Push win claims to hosts immediately
- Push win confirmations/rejections to players
- Update game state across all connected clients

## Recommended Approaches

### Option 1: Supabase (Recommended for Fastest Implementation)
**Pros:**
- ✅ Built-in authentication
- ✅ Real-time subscriptions (WebSocket-based)
- ✅ PostgreSQL database (SQL)
- ✅ Free tier available
- ✅ Easy React integration
- ✅ Row-level security for data protection
- ✅ No backend server code needed (just frontend + SQL)

**Cons:**
- Requires Supabase account setup
- Need to learn Supabase API

**Implementation Steps:**
1. Create Supabase project
2. Set up database schema (games, users, boards, win_claims)
3. Enable Row Level Security (RLS)
4. Replace localStorage calls with Supabase client calls
5. Use Supabase Realtime subscriptions for live updates

### Option 2: Firebase (Firestore)
**Pros:**
- ✅ Real-time database (Firestore)
- ✅ Built-in authentication
- ✅ Free tier available
- ✅ Good React integration
- ✅ Google-backed reliability

**Cons:**
- NoSQL (different from SQL mindset)
- Can get expensive at scale
- Less flexible queries than SQL

### Option 3: Node.js + Express + PostgreSQL + Socket.io
**Pros:**
- ✅ Full control
- ✅ Can use existing knowledge
- ✅ Customizable
- ✅ Can deploy to Vercel Functions or separate server

**Cons:**
- More setup work
- Need to write all backend code
- Need to manage database
- Need to deploy and maintain server

### Option 4: Vercel Serverless Functions + Database (PlanetScale/Supabase)
**Pros:**
- ✅ Works with existing Vercel deployment
- ✅ Serverless (scales automatically)
- ✅ Can use Supabase/PlanetScale for database
- ✅ No separate server to maintain

**Cons:**
- Cold starts can add latency
- More complex than full backend framework
- Still need external database

## Detailed API Endpoints Needed

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Games
- `POST /api/games` - Create new game
- `GET /api/games/:code` - Get game by code
- `POST /api/games/:code/join` - Join existing game
- `DELETE /api/games/:code` - End/delete game (host only)
- `GET /api/users/:userId/games` - Get user's games

### Board State
- `GET /api/games/:code/boards/:userId` - Get user's board for a game
- `PUT /api/games/:code/boards/:userId` - Update user's board state
- `POST /api/games/:code/boards/:userId/generate` - Generate new board

### Win Claims
- `POST /api/games/:code/claims` - Submit win claim (player)
- `GET /api/games/:code/claims/pending` - Get pending claims (host)
- `POST /api/games/:code/claims/:claimId/confirm` - Confirm win (host)
- `POST /api/games/:code/claims/:claimId/reject` - Reject win (host)

### Real-Time Events (WebSocket/SSE)
- `game:${code}:claim` - New win claim submitted
- `game:${code}:claim:confirmed` - Win claim confirmed
- `game:${code}:claim:rejected` - Win claim rejected with details

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Games Table
```sql
CREATE TABLE games (
  code VARCHAR(5) PRIMARY KEY,
  host_id UUID REFERENCES users(id),
  config JSONB NOT NULL, -- {items, boardSize, useFreeSpace}
  status VARCHAR(20) DEFAULT 'active', -- active, ended
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Game Participants Table
```sql
CREATE TABLE game_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_code VARCHAR(5) REFERENCES games(code),
  user_id UUID REFERENCES users(id),
  is_host BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(game_code, user_id)
);
```

### Board States Table
```sql
CREATE TABLE board_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_code VARCHAR(5) REFERENCES games(code),
  user_id UUID REFERENCES users(id),
  board JSONB NOT NULL, -- Array of board cells
  marked_indices INTEGER[] NOT NULL, -- Array of marked cell indices
  has_won BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(game_code, user_id)
);
```

### Win Claims Table
```sql
CREATE TABLE win_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_code VARCHAR(5) REFERENCES games(code),
  user_id UUID REFERENCES users(id),
  claim_type VARCHAR(20) NOT NULL, -- row, column, diagonal
  claimed_indices INTEGER[] NOT NULL,
  claimed_items TEXT[] NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, rejected
  incorrect_indices INTEGER[],
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

## Migration Path

### Phase 1: Setup Backend
1. Choose backend solution (recommend Supabase)
2. Set up database schema
3. Implement authentication endpoints
4. Test authentication flow

### Phase 2: Game Management
1. Implement game CRUD operations
2. Replace localStorage game creation/retrieval
3. Test game sharing across devices

### Phase 3: Board State Sync
1. Implement board state storage/retrieval
2. Add auto-save functionality
3. Test board persistence

### Phase 4: Real-Time Features
1. Set up WebSocket/SSE connection
2. Implement win claim notifications
3. Implement win verification flow
4. Test real-time updates

### Phase 5: Polish & Testing
1. Error handling
2. Loading states
3. Offline handling
4. Performance optimization

## Estimated Effort

- **Supabase Approach:** 1-2 days (fastest)
- **Firebase Approach:** 2-3 days
- **Custom Node.js Backend:** 5-7 days
- **Vercel Functions + Database:** 3-4 days

## Next Steps

1. **Recommendation:** Start with Supabase for fastest implementation
2. Create Supabase project
3. Set up database schema
4. Create migration script to replace localStorage calls
5. Test with multiple devices/browsers
6. Deploy and monitor
