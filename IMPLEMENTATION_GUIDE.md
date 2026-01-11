# Implementation Guide: Adding Supabase Backend

## Quick Start with Supabase

### Step 1: Set Up Supabase Project

1. Go to https://supabase.com and create an account
2. Create a new project
3. Note your project URL and anon/public key (found in Settings > API)

### Step 2: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Step 3: Create Supabase Client Configuration

Create `src/lib/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Step 4: Environment Variables

Create `.env.local`:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 5: Database Setup

Run this SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Supabase handles auth, but we can extend)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table
CREATE TABLE public.games (
  code VARCHAR(5) PRIMARY KEY,
  host_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game participants
CREATE TABLE public.game_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_code VARCHAR(5) REFERENCES public.games(code) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  is_host BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_code, user_id)
);

-- Board states
CREATE TABLE public.board_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_code VARCHAR(5) REFERENCES public.games(code) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  board JSONB NOT NULL,
  marked_indices INTEGER[] DEFAULT '{}',
  has_won BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_code, user_id)
);

-- Win claims
CREATE TABLE public.win_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_code VARCHAR(5) REFERENCES public.games(code) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  claim_type VARCHAR(20) NOT NULL,
  claimed_indices INTEGER[] NOT NULL,
  claimed_items TEXT[] NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  incorrect_indices INTEGER[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_games_host ON public.games(host_id);
CREATE INDEX idx_participants_game ON public.game_participants(game_code);
CREATE INDEX idx_participants_user ON public.game_participants(user_id);
CREATE INDEX idx_board_states_game_user ON public.board_states(game_code, user_id);
CREATE INDEX idx_win_claims_game ON public.win_claims(game_code);
CREATE INDEX idx_win_claims_status ON public.win_claims(status) WHERE status = 'pending';

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.win_claims ENABLE ROW LEVEL SECURITY;

-- Policies: Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Policies: Games are readable by all authenticated users
CREATE POLICY "Anyone can read games" ON public.games
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Hosts can create games" ON public.games
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

-- Policies: Participants can read their games
CREATE POLICY "Participants can read their games" ON public.game_participants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can join games" ON public.game_participants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policies: Users can update their own board states
CREATE POLICY "Users can update own board" ON public.board_states
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Policies: Win claims readable by game participants
CREATE POLICY "Participants can read claims" ON public.win_claims
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.game_participants
      WHERE game_code = win_claims.game_code
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Players can create claims" ON public.win_claims
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hosts can update claims" ON public.win_claims
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE code = win_claims.game_code
      AND host_id = auth.uid()
    )
  );
```

### Step 6: Authentication Service

Create `src/services/auth.js`:

```javascript
import { supabase } from '../lib/supabase'

export const authService = {
  async signUp(username, email, password) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (authError) throw authError
    
    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        username,
      })
    
    if (profileError) throw profileError
    
    return authData.user
  },
  
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    return data.user
  },
  
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
  
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },
  
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },
}
```

### Step 7: Game Service

Create `src/services/game.js`:

```javascript
import { supabase } from '../lib/supabase'

export const gameService = {
  async createGame(code, hostId, config) {
    const { data, error } = await supabase
      .from('games')
      .insert({
        code,
        host_id: hostId,
        config,
        status: 'active',
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Add host as participant
    await supabase
      .from('game_participants')
      .insert({
        game_code: code,
        user_id: hostId,
        is_host: true,
      })
    
    return data
  },
  
  async getGame(code) {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('code', code)
      .single()
    
    if (error) throw error
    return data
  },
  
  async joinGame(code, userId) {
    // Check if game exists
    const game = await this.getGame(code)
    if (!game || game.status !== 'active') {
      throw new Error('Game not found or not active')
    }
    
    // Add as participant
    const { data, error } = await supabase
      .from('game_participants')
      .insert({
        game_code: code,
        user_id: userId,
        is_host: false,
      })
      .select()
      .single()
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Already joined this game')
      }
      throw error
    }
    
    return game
  },
  
  async getUserGames(userId) {
    const { data, error } = await supabase
      .from('game_participants')
      .select(`
        *,
        game:games(*)
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
    
    if (error) throw error
    return data
  },
}
```

### Step 8: Real-Time Subscriptions

In your React component:

```javascript
import { supabase } from '../lib/supabase'
import { useEffect } from 'react'

// Subscribe to win claims for a game
useEffect(() => {
  if (!gameCode || !isHost) return
  
  const channel = supabase
    .channel(`game:${gameCode}:claims`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'win_claims',
        filter: `game_code=eq.${gameCode}`,
      },
      (payload) => {
        const newClaim = payload.new
        if (newClaim.status === 'pending') {
          setPendingWinClaim({
            type: newClaim.claim_type,
            indices: newClaim.claimed_indices,
            items: newClaim.claimed_items,
            userId: newClaim.user_id,
            claimId: newClaim.id,
            timestamp: Date.now(),
          })
        }
      }
    )
    .subscribe()
  
  return () => {
    supabase.removeChannel(channel)
  }
}, [gameCode, isHost])
```

## Migration Checklist

- [ ] Set up Supabase project
- [ ] Install dependencies (`@supabase/supabase-js`)
- [ ] Create environment variables
- [ ] Set up database schema
- [ ] Create service files (auth, game, board, claims)
- [ ] Replace localStorage auth with Supabase auth
- [ ] Replace localStorage game storage with Supabase
- [ ] Replace localStorage board state with Supabase
- [ ] Add real-time subscriptions for win claims
- [ ] Update UI to handle loading states
- [ ] Add error handling
- [ ] Test with multiple devices/browsers
- [ ] Deploy and test production

## Benefits After Migration

✅ Games accessible across all devices/browsers
✅ Real-time win claim notifications
✅ Secure authentication with password hashing
✅ Persistent game state
✅ Can handle many concurrent players
✅ Automatic backups via Supabase
✅ Scales automatically
