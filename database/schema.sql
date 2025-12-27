-- Database: virtualgames_db

-- 1. USERS TABLE
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID, -- References tenants(tenant_id) (Nullable for legacy/global users or strictly enforced?) Enforced in logic.
    username VARCHAR(50) NOT NULL, -- Removed UNIQUE constraint here, need composite unique
    role VARCHAR(20) DEFAULT 'player', -- 'admin', 'player'
    email VARCHAR(255), -- Made nullable for guest players
    password_hash VARCHAR(255), -- Made nullable for guest players
    avatar_url TEXT,
    drive_id VARCHAR(255), -- deviceId equivalent
    join_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_online TIMESTAMP WITH TIME ZONE,
    total_points INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(username, tenant_id)
);

-- 2. GAME ROOMS TABLE
CREATE TABLE game_rooms (
    room_id VARCHAR(10) PRIMARY KEY, -- Using short codes like 'ABCD'
    tenant_id UUID, -- References tenants
    host_id UUID REFERENCES users(user_id),
    room_name VARCHAR(100),
    max_players INTEGER DEFAULT 8,
    game_type VARCHAR(20) NOT NULL, -- 'draw', 'rebus', etc.
    team_mode BOOLEAN DEFAULT FALSE,
    config JSON, -- Store full room config here
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'playing', 'finished'
    created_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_time TIMESTAMP WITH TIME ZONE
);

-- 3. LEADERBOARDS TABLE
-- Note: Rank is typically calculated dynamically, but can be cached here
CREATE TABLE leaderboards (
    leaderboard_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID, -- References tenants
    user_id UUID REFERENCES users(user_id),
    points INTEGER NOT NULL DEFAULT 0,
    rank INTEGER, -- Cached rank position
    season_id VARCHAR(20) DEFAULT 'global', -- For seasonal resets
    last_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, user_id, season_id)
);

-- INDEXES for Performance
CREATE INDEX idx_users_points ON users(total_points DESC);
CREATE INDEX idx_rooms_status ON game_rooms(status);
CREATE INDEX idx_leaderboard_points ON leaderboards(points DESC);

-- 4. TENANTS TABLE
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'public', -- 'public', 'private'
    branding JSON, -- { "logo": "url", "theme": "hex" }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MIGRATION: Add columns if they don't exist (SQLite syntax limitation handling via checks or direct alter in tool)
-- Ideally we would run ALTER TABLE, but for this schema definition file we append them.
-- In a real migration we'd check existence. Here we define what the fresh schema looks like.
-- PLEASE NOTE: User needs to reset DB or we need an ALTER script if maintaining data.
-- Assuming 'scratch' environment allows schema updates. I will modify the CREATE statements above for a fresh start,
-- OR use ALTER statements below if the file is used for initialization.

-- Let's stick to appending ALTERs for safety if the init runs sequentially
-- But standard CREATEs are better for fresh viewing.
-- I will edit the original CREATE statements to include tenant_id.

-- RESETTING TABLES FOR THIS MAJOR ARCHITECTURE CHANGE IS RECOMMENDED
-- BUT I WILL USE ALTER STATEMENTS DOWN HERE TO PRESERVE DATA IF POSSIBLE
-- HOWEVER, 'users' needs to scope to 'tenant_id'.

-- 5. MULTI-TENANCY UPDATES
-- Users are now tenant-scoped.
-- ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(tenant_id);
-- ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'player'; -- 'admin', 'player'
-- ALTER TABLE users DROP CONSTRAINT users_username_key; -- Username unique only per tenant?
-- UNIQUE(username, tenant_id)

-- game_rooms tenant scope
-- ALTER TABLE game_rooms ADD COLUMN tenant_id UUID REFERENCES tenants(tenant_id);

-- leaderboards tenant scope
-- ALTER TABLE leaderboards ADD COLUMN tenant_id UUID REFERENCES tenants(tenant_id);
