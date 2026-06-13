const { getPool } = require("./db.js");

const DEFAULT_VOICE_CATEGORIES = {
    public: { name: "Public Ses", channels: [], multiplier: 2.0 },
    game: { name: "Oyun Ses", channels: [], multiplier: 1.5 },
    stream: { name: "Yayin Ses", channels: [], multiplier: 2.5 },
    staff: { name: "Yetkili Ses", channels: [], multiplier: 3.0 },
    register: { name: "Kayit Ses", channels: [], multiplier: 1.0 }
};

function rowToDoc(row) {
    const rawCats = row.voice_categories || {};
    const voiceCategoriesObj = Object.keys(rawCats).length > 0 ? rawCats : DEFAULT_VOICE_CATEGORIES;
    const voiceCategories = new Map(
        Object.entries(voiceCategoriesObj).map(([k, v]) => [k, v])
    );

    return new GuildConfigDB({
        guildID: row.guild_id,
        allowedChannels: Array.isArray(row.allowed_channels) ? row.allowed_channels : [],
        botVoiceChannelID: row.bot_voice_channel_id || "",
        twitchURL: row.twitch_url || "https://twitch.tv/loki",
        activityName: row.activity_name || "Loki Istatistik Sistemi",
        logChannelID: row.log_channel_id || "",
        voiceCategories,
        filteredUsers: Array.isArray(row.filtered_users) ? row.filtered_users : [],
        filteredChannels: Array.isArray(row.filtered_channels) ? row.filtered_channels : [],
        filteredRoles: Array.isArray(row.filtered_roles) ? row.filtered_roles : [],
        staffRoles: Array.isArray(row.staff_roles) ? row.staff_roles : []
    });
}

class GuildConfigDB {
    constructor(data) {
        this.guildID = data.guildID || "";
        this.allowedChannels = data.allowedChannels || [];
        this.botVoiceChannelID = data.botVoiceChannelID || "";
        this.twitchURL = data.twitchURL || "https://twitch.tv/loki";
        this.activityName = data.activityName || "Loki Istatistik Sistemi";
        this.logChannelID = data.logChannelID || "";
        this.voiceCategories =
            data.voiceCategories instanceof Map
                ? data.voiceCategories
                : new Map(Object.entries(DEFAULT_VOICE_CATEGORIES));
        this.filteredUsers = data.filteredUsers || [];
        this.filteredChannels = data.filteredChannels || [];
        this.filteredRoles = data.filteredRoles || [];
        this.staffRoles = data.staffRoles || [];
    }

    markModified() {}

    async save() {
        const pool = getPool();
        const vcObj = {};
        for (const [k, v] of this.voiceCategories.entries()) {
            vcObj[k] = v;
        }

        await pool.query(
            `INSERT INTO guild_config (
                guild_id, allowed_channels, bot_voice_channel_id,
                twitch_url, activity_name, log_channel_id,
                voice_categories, filtered_users, filtered_channels,
                filtered_roles, staff_roles
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            ON CONFLICT (guild_id) DO UPDATE SET
                allowed_channels = EXCLUDED.allowed_channels,
                bot_voice_channel_id = EXCLUDED.bot_voice_channel_id,
                twitch_url = EXCLUDED.twitch_url,
                activity_name = EXCLUDED.activity_name,
                log_channel_id = EXCLUDED.log_channel_id,
                voice_categories = EXCLUDED.voice_categories,
                filtered_users = EXCLUDED.filtered_users,
                filtered_channels = EXCLUDED.filtered_channels,
                filtered_roles = EXCLUDED.filtered_roles,
                staff_roles = EXCLUDED.staff_roles`,
            [
                this.guildID,
                JSON.stringify(this.allowedChannels),
                this.botVoiceChannelID,
                this.twitchURL,
                this.activityName,
                this.logChannelID,
                JSON.stringify(vcObj),
                JSON.stringify(this.filteredUsers),
                JSON.stringify(this.filteredChannels),
                JSON.stringify(this.filteredRoles),
                JSON.stringify(this.staffRoles)
            ]
        );
    }

    static async findOne(query) {
        const pool = getPool();
        const { guildID } = query;
        const result = await pool.query(
            "SELECT * FROM guild_config WHERE guild_id = $1 LIMIT 1",
            [guildID]
        );
        if (result.rows.length === 0) return null;
        return rowToDoc(result.rows[0]);
    }
}

module.exports = GuildConfigDB;
