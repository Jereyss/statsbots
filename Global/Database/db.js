const { Pool } = require("pg");
require("dotenv").config();

let pool;

function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    }
    return pool;
}

async function initializeDatabase() {
    const db = getPool();

    await db.query(`
        CREATE TABLE IF NOT EXISTS user_stats (
            id SERIAL PRIMARY KEY,
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            voice_daily BIGINT DEFAULT 0,
            voice_weekly BIGINT DEFAULT 0,
            voice_monthly BIGINT DEFAULT 0,
            voice_total BIGINT DEFAULT 0,
            voice_channels JSONB DEFAULT '{}',
            voice_categories JSONB DEFAULT '{}',
            message_daily BIGINT DEFAULT 0,
            message_weekly BIGINT DEFAULT 0,
            message_monthly BIGINT DEFAULT 0,
            message_total BIGINT DEFAULT 0,
            message_channels JSONB DEFAULT '{}',
            hourly_voice JSONB DEFAULT '[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]',
            daily_history JSONB DEFAULT '[]',
            inviter_id TEXT DEFAULT '',
            invite_regular BIGINT DEFAULT 0,
            invite_fake BIGINT DEFAULT 0,
            invite_left BIGINT DEFAULT 0,
            invite_bonus BIGINT DEFAULT 0,
            invite_total BIGINT DEFAULT 0,
            UNIQUE(guild_id, user_id)
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS guild_config (
            id SERIAL PRIMARY KEY,
            guild_id TEXT NOT NULL UNIQUE,
            allowed_channels JSONB DEFAULT '[]',
            bot_voice_channel_id TEXT DEFAULT '',
            twitch_url TEXT DEFAULT 'https://twitch.tv/loki',
            activity_name TEXT DEFAULT 'Loki Istatistik Sistemi',
            log_channel_id TEXT DEFAULT '',
            voice_categories JSONB DEFAULT '{}',
            filtered_users JSONB DEFAULT '[]',
            filtered_channels JSONB DEFAULT '[]',
            filtered_roles JSONB DEFAULT '[]',
            staff_roles JSONB DEFAULT '[]'
        )
    `);

    await db.query(`ALTER TABLE guild_config ADD COLUMN IF NOT EXISTS allowed_channels JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE guild_config ADD COLUMN IF NOT EXISTS bot_voice_channel_id TEXT DEFAULT ''`);
    await db.query(`ALTER TABLE guild_config ADD COLUMN IF NOT EXISTS twitch_url TEXT DEFAULT 'https://twitch.tv/loki'`);
    await db.query(`ALTER TABLE guild_config ADD COLUMN IF NOT EXISTS activity_name TEXT DEFAULT 'Loki Istatistik Sistemi'`);
    await db.query(`ALTER TABLE guild_config ADD COLUMN IF NOT EXISTS log_channel_id TEXT DEFAULT ''`);
    await db.query(`ALTER TABLE guild_config ADD COLUMN IF NOT EXISTS voice_categories JSONB DEFAULT '{}'`);
    await db.query(`ALTER TABLE guild_config ADD COLUMN IF NOT EXISTS filtered_users JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE guild_config ADD COLUMN IF NOT EXISTS filtered_channels JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE guild_config ADD COLUMN IF NOT EXISTS filtered_roles JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE guild_config ADD COLUMN IF NOT EXISTS staff_roles JSONB DEFAULT '[]'`);

    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS voice_daily BIGINT DEFAULT 0`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS voice_weekly BIGINT DEFAULT 0`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS voice_monthly BIGINT DEFAULT 0`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS voice_total BIGINT DEFAULT 0`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS voice_channels JSONB DEFAULT '{}'`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS voice_categories JSONB DEFAULT '{}'`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS message_daily BIGINT DEFAULT 0`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS message_weekly BIGINT DEFAULT 0`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS message_monthly BIGINT DEFAULT 0`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS message_total BIGINT DEFAULT 0`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS message_channels JSONB DEFAULT '{}'`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS hourly_voice JSONB DEFAULT '[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]'`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS daily_history JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS inviter_id TEXT DEFAULT ''`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS invite_regular BIGINT DEFAULT 0`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS invite_fake BIGINT DEFAULT 0`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS invite_left BIGINT DEFAULT 0`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS invite_bonus BIGINT DEFAULT 0`);
    await db.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS invite_total BIGINT DEFAULT 0`);

    console.log("[Neon DB] Tablolar basariyla olusturuldu/dogrulandi.");
}

module.exports = { getPool, initializeDatabase };
