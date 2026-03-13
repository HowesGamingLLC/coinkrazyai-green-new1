-- Migration to add missing tables and columns identified from route implementations

-- 1. Support & Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'closed', 'pending', 'resolved'
    priority VARCHAR(50) DEFAULT 'normal',
    category VARCHAR(100),
    assigned_admin_id INTEGER REFERENCES admin_users(id),
    assigned_to INTEGER REFERENCES admin_users(id), -- Alias for assigned_admin_id
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id INTEGER, -- player_id or admin_id depending on sender_type
    sender_type VARCHAR(20) NOT NULL, -- 'player', 'admin'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alias for ticket_messages if used in code
DROP VIEW IF EXISTS ticket_messages;
DROP TABLE IF EXISTS ticket_messages;
CREATE VIEW ticket_messages AS SELECT * FROM support_ticket_messages;

-- 2. Analytics & Usage
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    page_url VARCHAR(500),
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_usage (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_code INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Casino Spins (if not already handled by spin_results)
CREATE TABLE IF NOT EXISTS casino_game_spins (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    game_name VARCHAR(255),
    provider VARCHAR(100),
    bet_amount DECIMAL(15, 2) NOT NULL,
    winnings DECIMAL(15, 2) NOT NULL DEFAULT 0,
    balance_before DECIMAL(15, 2),
    balance_after DECIMAL(15, 2),
    result VARCHAR(50), -- 'win', 'loss', 'push'
    result_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Redemptions (Withdrawals)
CREATE TABLE IF NOT EXISTS redemption_requests (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SC',
    method VARCHAR(100),
    method_details JSONB,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
    rejected_reason TEXT,
    processed_at TIMESTAMP,
    processed_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. CMS & Content
CREATE TABLE IF NOT EXISTS cms_pages (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    page_type VARCHAR(50), -- 'page', 'post', 'notice'
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published'
    meta_description TEXT,
    featured_image VARCHAR(500),
    created_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cms_banners (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    image_url VARCHAR(500) NOT NULL,
    link_url VARCHAR(500),
    placement VARCHAR(100), -- 'home', 'sidebar', 'top'
    display_order INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Social Groups
CREATE TABLE IF NOT EXISTS social_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    is_private BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES players(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS social_group_members (
    group_id INTEGER REFERENCES social_groups(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- 'member', 'admin', 'moderator'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, player_id)
);

-- 7. Marketing & Retention
CREATE TABLE IF NOT EXISTS retention_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100), -- 'email', 'push', 'bonus'
    trigger_event VARCHAR(100),
    reward_type VARCHAR(100),
    reward_amount DECIMAL(15, 2),
    target_criteria JSONB,
    status VARCHAR(50) DEFAULT 'draft',
    enabled BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS make_it_rain_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_amount DECIMAL(15, 2) NOT NULL,
    amount_distributed DECIMAL(15, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'SC',
    target_players VARCHAR(100), -- 'all', 'vip', 'active'
    min_players INTEGER DEFAULT 1,
    max_players INTEGER,
    players_participating INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'scheduled',
    scheduled_at TIMESTAMP,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    completed_at TIMESTAMP,
    created_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS make_it_rain_rewards (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES make_it_rain_campaigns(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Advanced Admin & Security
CREATE TABLE IF NOT EXISTS player_vip (
    player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    vip_tier_id INTEGER,
    vip_points INTEGER DEFAULT 0,
    month_wagered DECIMAL(15, 2) DEFAULT 0,
    promoted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS vip_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    level INTEGER UNIQUE NOT NULL,
    min_wagered DECIMAL(15, 2) DEFAULT 0,
    reload_bonus_percentage DECIMAL(5, 2) DEFAULT 0,
    birthday_bonus DECIMAL(15, 2) DEFAULT 0,
    exclusive_games JSONB DEFAULT '[]',
    priority_support BOOLEAN DEFAULT FALSE,
    requirements JSONB,
    benefits JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fraud_patterns (
    id SERIAL PRIMARY KEY,
    pattern_name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(100), -- 'wager_amount', 'login_frequency', 'ip_mismatch'
    threshold_value DECIMAL(15, 2),
    action VARCHAR(100), -- 'flag', 'suspend', 'block'
    severity VARCHAR(50) DEFAULT 'medium',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fraud_flags (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    pattern_id INTEGER REFERENCES fraud_patterns(id) ON DELETE SET NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admin_users(id),
    player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100), -- 'player', 'game', 'setting'
    resource_id VARCHAR(100),
    details TEXT,
    new_values JSONB,
    ip_address VARCHAR(45),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_logs (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aml_checks (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    check_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    result TEXT,
    risk_level VARCHAR(50), -- 'low', 'medium', 'high'
    verified_by INTEGER REFERENCES admin_users(id),
    verified_at TIMESTAMP,
    check_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    admin_id INTEGER REFERENCES admin_users(id),
    permissions JSONB,
    rate_limit INTEGER DEFAULT 100,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'revoked', 'expired'
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50), -- 'email', 'sms', 'push'
    subject VARCHAR(255),
    template TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Affiliate Management
CREATE TABLE IF NOT EXISTS affiliate_partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    website VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    commission_percentage DECIMAL(5, 2) DEFAULT 10.0,
    approved_by INTEGER REFERENCES admin_users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS affiliate_links (
    id SERIAL PRIMARY KEY,
    affiliate_id INTEGER REFERENCES affiliate_partners(id) ON DELETE CASCADE,
    unique_code VARCHAR(100) UNIQUE NOT NULL,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS affiliate_referrals (
    id SERIAL PRIMARY KEY,
    affiliate_id INTEGER REFERENCES affiliate_partners(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    total_wagered DECIMAL(15, 2) DEFAULT 0,
    commission_earned DECIMAL(15, 2) DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Game Configuration & Providers
CREATE TABLE IF NOT EXISTS game_config (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, config_key)
);

CREATE TABLE IF NOT EXISTS provider_games (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER, -- Link to game_providers if needed
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    external_game_id VARCHAR(255) NOT NULL,
    provider_name VARCHAR(100),
    sync_status VARCHAR(50) DEFAULT 'synced',
    last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_name, external_game_id)
);

-- 10. Missing columns in existing tables
ALTER TABLE players ADD COLUMN IF NOT EXISTS vip_status VARCHAR(50);
ALTER TABLE players ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE referral_links ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;
ALTER TABLE referral_links ADD COLUMN IF NOT EXISTS conversions INTEGER DEFAULT 0;
ALTER TABLE referral_links ADD COLUMN IF NOT EXISTS total_referral_bonus DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE bonuses ADD COLUMN IF NOT EXISTS wagering_multiplier DECIMAL(5, 2) DEFAULT 35.0;
ALTER TABLE casino_settings ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES admin_users(id);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE casino_game_spins ADD COLUMN IF NOT EXISTS result_data JSONB;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES admin_users(id);

-- 11. Missing Game-Specific Tables
CREATE TABLE IF NOT EXISTS poker_sessions (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    table_id INTEGER REFERENCES poker_tables(id) ON DELETE CASCADE,
    buy_in DECIMAL(15, 2) NOT NULL,
    current_chips DECIMAL(15, 2),
    status VARCHAR(50) DEFAULT 'Active',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bingo_tickets (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    game_id INTEGER REFERENCES bingo_games(id) ON DELETE CASCADE,
    ticket_data JSONB,
    ticket_price DECIMAL(10, 2) NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sports_bets (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES sports_events(id) ON DELETE CASCADE,
    bet_type VARCHAR(100) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    odds DECIMAL(10, 2) NOT NULL,
    potential_winnings DECIMAL(15, 2),
    actual_winnings DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pending',
    settled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. AI Conversation History & Management
CREATE TABLE IF NOT EXISTS ai_conversation_history (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    agent_id VARCHAR(100),
    agent_name VARCHAR(100) DEFAULT 'LuckyAI',
    message_type VARCHAR(50) NOT NULL, -- 'user', 'ai', 'system'
    message_content TEXT NOT NULL,
    message_metadata JSONB DEFAULT '{}',
    sentiment VARCHAR(50), -- 'positive', 'neutral', 'negative'
    context_tokens INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_player_session ON ai_conversation_history(player_id, session_id);

CREATE TABLE IF NOT EXISTS ai_conversation_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    title VARCHAR(255),
    topic VARCHAR(100),
    context_summary TEXT,
    total_messages INTEGER DEFAULT 0,
    total_context_tokens INTEGER DEFAULT 0,
    rating INTEGER, -- 1-5 star rating
    feedback TEXT,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'archived', 'deleted'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_interaction_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_agent_status (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(100) UNIQUE NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'idle', -- 'idle', 'active', 'busy', 'offline'
    current_task VARCHAR(255),
    total_conversations INTEGER DEFAULT 0,
    average_response_time_ms INTEGER,
    last_activity_at TIMESTAMP,
    uptime_percentage DECIMAL(5, 2) DEFAULT 100.00,
    performance_score DECIMAL(5, 2) DEFAULT 100.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_content_filter_logs (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    original_message TEXT,
    filtered_message TEXT,
    filter_reason VARCHAR(255),
    severity VARCHAR(50), -- 'low', 'medium', 'high'
    action_taken VARCHAR(100), -- 'filtered', 'blocked', 'flagged'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_rate_limits (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    window_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, endpoint)
);

-- 13. Pool Shark Game Tables
CREATE TABLE IF NOT EXISTS pool_tables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    min_buy_in DECIMAL(15, 2) NOT NULL DEFAULT 5.0,
    max_buy_in DECIMAL(15, 2) NOT NULL DEFAULT 1000.0,
    max_players INTEGER DEFAULT 2,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'maintenance'
    house_fee DECIMAL(15, 2) DEFAULT 0.50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pool_games (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES pool_tables(id) ON DELETE CASCADE,
    creator_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'waiting', -- 'waiting', 'in-progress', 'finished'
    total_pot DECIMAL(15, 2) NOT NULL DEFAULT 0.0,
    winner_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    game_duration_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pool_game_players (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES pool_games(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    buy_in DECIMAL(15, 2) NOT NULL,
    balls_type VARCHAR(50), -- 'solid', 'stripe', 'none'
    balls_hit TEXT[] DEFAULT '{}', -- array of ball numbers hit
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'eliminated', 'winner'
    is_current_turn BOOLEAN DEFAULT FALSE,
    turn_count INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, player_id)
);

CREATE TABLE IF NOT EXISTS pool_game_raises (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES pool_games(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    raise_amount DECIMAL(15, 2) NOT NULL,
    new_pot DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pool_game_events (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES pool_games(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- 'ball_sunk', 'shot', 'scratch', 'win', 'raise'
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_pool_games_table_id ON pool_games(table_id);
CREATE INDEX IF NOT EXISTS idx_pool_games_creator_id ON pool_games(creator_id);
CREATE INDEX IF NOT EXISTS idx_pool_games_status ON pool_games(status);
CREATE INDEX IF NOT EXISTS idx_pool_game_players_game_id ON pool_game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_pool_game_players_player_id ON pool_game_players(player_id);
CREATE INDEX IF NOT EXISTS idx_pool_game_raises_game_id ON pool_game_raises(game_id);
