const { getPool } = require("./db.js");

const DEFAULT_HOURLY = "[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]";

function rowToDoc(row) {
    return new UserStatsDB({
        guildID: row.guild_id,
        userID: row.user_id,
        voiceActive: {
            daily: Number(row.voice_daily) || 0,
            weekly: Number(row.voice_weekly) || 0,
            monthly: Number(row.voice_monthly) || 0,
            total: Number(row.voice_total) || 0
        },
        voiceChannels: new Map(Object.entries(row.voice_channels || {})),
        voiceCategories: new Map(
            Object.entries(row.voice_categories || {}).map(([k, v]) => [k, Number(v)])
        ),
        messageActive: {
            daily: Number(row.message_daily) || 0,
            weekly: Number(row.message_weekly) || 0,
            monthly: Number(row.message_monthly) || 0,
            total: Number(row.message_total) || 0
        },
        messageChannels: new Map(Object.entries(row.message_channels || {})),
        hourlyVoice: Array.isArray(row.hourly_voice)
            ? row.hourly_voice.map(Number)
            : Array(24).fill(0),
        dailyHistory: Array.isArray(row.daily_history) ? row.daily_history : [],
        inviterID: row.inviter_id || "",
        inviteStats: {
            regular: Number(row.invite_regular) || 0,
            fake: Number(row.invite_fake) || 0,
            left: Number(row.invite_left) || 0,
            bonus: Number(row.invite_bonus) || 0,
            total: Number(row.invite_total) || 0
        }
    });
}

class UserStatsDB {
    constructor(data) {
        this.guildID = data.guildID || "";
        this.userID = data.userID || "";
        this.voiceActive = data.voiceActive || { daily: 0, weekly: 0, monthly: 0, total: 0 };
        this.voiceChannels =
            data.voiceChannels instanceof Map
                ? data.voiceChannels
                : new Map(Object.entries(data.voiceChannels || {}));
        this.voiceCategories =
            data.voiceCategories instanceof Map
                ? data.voiceCategories
                : new Map(Object.entries(data.voiceCategories || {}));
        this.messageActive = data.messageActive || { daily: 0, weekly: 0, monthly: 0, total: 0 };
        this.messageChannels =
            data.messageChannels instanceof Map
                ? data.messageChannels
                : new Map(Object.entries(data.messageChannels || {}));
        this.hourlyVoice = data.hourlyVoice || Array(24).fill(0);
        this.dailyHistory = data.dailyHistory || [];
        this.inviterID = data.inviterID || "";
        this.inviteStats = data.inviteStats || {
            regular: 0, fake: 0, left: 0, bonus: 0, total: 0
        };
    }

    markModified() {}

    async save() {
        const pool = getPool();
        const vcObj = Object.fromEntries(this.voiceChannels);
        const vCatObj = Object.fromEntries(this.voiceCategories);
        const mcObj = Object.fromEntries(this.messageChannels);

        await pool.query(
            `INSERT INTO user_stats (
                guild_id, user_id,
                voice_daily, voice_weekly, voice_monthly, voice_total,
                voice_channels, voice_categories,
                message_daily, message_weekly, message_monthly, message_total,
                message_channels, hourly_voice, daily_history,
                inviter_id, invite_regular, invite_fake, invite_left, invite_bonus, invite_total
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
            ON CONFLICT (guild_id, user_id) DO UPDATE SET
                voice_daily = EXCLUDED.voice_daily,
                voice_weekly = EXCLUDED.voice_weekly,
                voice_monthly = EXCLUDED.voice_monthly,
                voice_total = EXCLUDED.voice_total,
                voice_channels = EXCLUDED.voice_channels,
                voice_categories = EXCLUDED.voice_categories,
                message_daily = EXCLUDED.message_daily,
                message_weekly = EXCLUDED.message_weekly,
                message_monthly = EXCLUDED.message_monthly,
                message_total = EXCLUDED.message_total,
                message_channels = EXCLUDED.message_channels,
                hourly_voice = EXCLUDED.hourly_voice,
                daily_history = EXCLUDED.daily_history,
                inviter_id = EXCLUDED.inviter_id,
                invite_regular = EXCLUDED.invite_regular,
                invite_fake = EXCLUDED.invite_fake,
                invite_left = EXCLUDED.invite_left,
                invite_bonus = EXCLUDED.invite_bonus,
                invite_total = EXCLUDED.invite_total`,
            [
                this.guildID, this.userID,
                this.voiceActive.daily, this.voiceActive.weekly,
                this.voiceActive.monthly, this.voiceActive.total,
                JSON.stringify(vcObj), JSON.stringify(vCatObj),
                this.messageActive.daily, this.messageActive.weekly,
                this.messageActive.monthly, this.messageActive.total,
                JSON.stringify(mcObj),
                JSON.stringify(this.hourlyVoice),
                JSON.stringify(this.dailyHistory),
                this.inviterID || "",
                this.inviteStats.regular || 0,
                this.inviteStats.fake || 0,
                this.inviteStats.left || 0,
                this.inviteStats.bonus || 0,
                this.inviteStats.total || 0
            ]
        );
    }

    static async findOne(query) {
        const pool = getPool();
        const { guildID, userID } = query;
        const result = await pool.query(
            "SELECT * FROM user_stats WHERE guild_id = $1 AND user_id = $2 LIMIT 1",
            [guildID, userID]
        );
        if (result.rows.length === 0) return null;
        return rowToDoc(result.rows[0]);
    }

    static async findOneAndUpdate(query, update, options = {}) {
        const pool = getPool();
        const { guildID, userID } = query;
        const inc = update.$inc || {};

        let voiceDaily = 0, voiceWeekly = 0, voiceMonthly = 0, voiceTotal = 0;
        let msgDaily = 0, msgWeekly = 0, msgMonthly = 0, msgTotal = 0;
        const voiceChannelIncs = {};
        const voiceCategoryIncs = {};
        const msgChannelIncs = {};
        const hourlyIncs = {};

        for (const [k, v] of Object.entries(inc)) {
            if (k === "voiceActive.daily") voiceDaily += v;
            else if (k === "voiceActive.weekly") voiceWeekly += v;
            else if (k === "voiceActive.monthly") voiceMonthly += v;
            else if (k === "voiceActive.total") voiceTotal += v;
            else if (k === "messageActive.daily") msgDaily += v;
            else if (k === "messageActive.weekly") msgWeekly += v;
            else if (k === "messageActive.monthly") msgMonthly += v;
            else if (k === "messageActive.total") msgTotal += v;
            else if (k.startsWith("voiceChannels.")) {
                const key = k.slice(14);
                voiceChannelIncs[key] = (voiceChannelIncs[key] || 0) + v;
            } else if (k.startsWith("voiceCategories.")) {
                const key = k.slice(16);
                voiceCategoryIncs[key] = (voiceCategoryIncs[key] || 0) + v;
            } else if (k.startsWith("messageChannels.")) {
                const key = k.slice(16);
                msgChannelIncs[key] = (msgChannelIncs[key] || 0) + v;
            } else if (k.startsWith("hourlyVoice.")) {
                const key = k.slice(12);
                hourlyIncs[key] = (hourlyIncs[key] || 0) + v;
            }
        }

        await pool.query(
            `INSERT INTO user_stats (guild_id, user_id, voice_daily, voice_weekly, voice_monthly, voice_total, message_daily, message_weekly, message_monthly, message_total)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (guild_id, user_id) DO UPDATE SET
                voice_daily = user_stats.voice_daily + $3,
                voice_weekly = user_stats.voice_weekly + $4,
                voice_monthly = user_stats.voice_monthly + $5,
                voice_total = user_stats.voice_total + $6,
                message_daily = user_stats.message_daily + $7,
                message_weekly = user_stats.message_weekly + $8,
                message_monthly = user_stats.message_monthly + $9,
                message_total = user_stats.message_total + $10`,
            [guildID, userID, voiceDaily, voiceWeekly, voiceMonthly, voiceTotal,
             msgDaily, msgWeekly, msgMonthly, msgTotal]
        );

        for (const [chanId, amount] of Object.entries(voiceChannelIncs)) {
            await pool.query(
                `UPDATE user_stats SET
                    voice_channels = jsonb_set(
                        COALESCE(voice_channels, '{}'::jsonb),
                        ARRAY[$3::text],
                        to_jsonb(COALESCE((voice_channels->>$3)::bigint, 0) + $4)
                    )
                 WHERE guild_id = $1 AND user_id = $2`,
                [guildID, userID, chanId, amount]
            );
        }

        for (const [catKey, amount] of Object.entries(voiceCategoryIncs)) {
            await pool.query(
                `UPDATE user_stats SET
                    voice_categories = jsonb_set(
                        COALESCE(voice_categories, '{}'::jsonb),
                        ARRAY[$3::text],
                        to_jsonb(COALESCE((voice_categories->>$3)::bigint, 0) + $4)
                    )
                 WHERE guild_id = $1 AND user_id = $2`,
                [guildID, userID, catKey, amount]
            );
        }

        for (const [chanId, amount] of Object.entries(msgChannelIncs)) {
            await pool.query(
                `UPDATE user_stats SET
                    message_channels = jsonb_set(
                        COALESCE(message_channels, '{}'::jsonb),
                        ARRAY[$3::text],
                        to_jsonb(COALESCE((message_channels->>$3)::bigint, 0) + $4)
                    )
                 WHERE guild_id = $1 AND user_id = $2`,
                [guildID, userID, chanId, amount]
            );
        }

        for (const [hourIdx, amount] of Object.entries(hourlyIncs)) {
            await pool.query(
                `UPDATE user_stats SET
                    hourly_voice = jsonb_set(
                        COALESCE(hourly_voice, '${DEFAULT_HOURLY}'::jsonb),
                        ARRAY[$3::text],
                        to_jsonb(COALESCE((hourly_voice->($3::int))::bigint, 0) + $4)
                    )
                 WHERE guild_id = $1 AND user_id = $2`,
                [guildID, userID, hourIdx, amount]
            );
        }

        const result = await pool.query(
            "SELECT * FROM user_stats WHERE guild_id = $1 AND user_id = $2",
            [guildID, userID]
        );
        if (result.rows.length === 0) return null;
        return rowToDoc(result.rows[0]);
    }

    static find(query, projection) {
        const thenable = {
            _query: query,
            lean() { return this; },
            then(resolve, reject) {
                return UserStatsDB._executeFind(thenable._query).then(resolve, reject);
            },
            catch(reject) {
                return UserStatsDB._executeFind(thenable._query).catch(reject);
            }
        };
        return thenable;
    }

    static async _executeFind(query) {
        const pool = getPool();

        if (query.$or) {
            const result = await pool.query(
                "SELECT * FROM user_stats WHERE voice_daily > 0 OR message_daily > 0"
            );
            return result.rows.map(rowToDoc);
        }

        const { guildID, userID } = query;

        if (userID && typeof userID === "object" && userID.$in) {
            const result = await pool.query(
                "SELECT * FROM user_stats WHERE guild_id = $1 AND user_id = ANY($2::text[])",
                [guildID, userID.$in]
            );
            return result.rows.map(rowToDoc);
        }

        if (guildID && userID && typeof userID === "string") {
            const result = await pool.query(
                "SELECT * FROM user_stats WHERE guild_id = $1 AND user_id = $2",
                [guildID, userID]
            );
            return result.rows.map(rowToDoc);
        }

        if (guildID) {
            const result = await pool.query(
                "SELECT * FROM user_stats WHERE guild_id = $1",
                [guildID]
            );
            return result.rows.map(rowToDoc);
        }

        return [];
    }

    static async deleteOne(query) {
        const pool = getPool();
        const { guildID, userID } = query;
        await pool.query(
            "DELETE FROM user_stats WHERE guild_id = $1 AND user_id = $2",
            [guildID, userID]
        );
    }

    static async deleteMany(query) {
        const pool = getPool();
        const { guildID } = query;
        if (guildID) {
            await pool.query("DELETE FROM user_stats WHERE guild_id = $1", [guildID]);
        }
    }
}

module.exports = UserStatsDB;
