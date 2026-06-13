const moment = require("moment");

module.exports = {
    name: "voiceStateUpdate",
    execute: async (client, oldState, newState) => {
        if (oldState.member?.user.bot || newState.member?.user.bot) return;

        const member = newState.member || oldState.member;
        if (!member) return;

        const guild = newState.guild || oldState.guild;
        const userId = member.id;
        const guildId = guild.id;
        const afkChannelId = guild.afkChannelId;

        const isEligible = (state) => {
            return !!(
                state.channelId &&
                state.channelId !== afkChannelId &&
                !state.selfDeaf &&
                !state.serverDeaf
            );
        };

        const wasEligible = isEligible(oldState);
        const nowEligible = isEligible(newState);
        const session = client.voiceSessions.get(userId);

        if (!wasEligible && nowEligible && newState.channelId) {
            client.voiceSessions.set(userId, {
                channelId: newState.channelId,
                joinedAt: Date.now()
            });
        } else if (wasEligible && !nowEligible) {
            if (session) {
                const duration = Math.floor((Date.now() - session.joinedAt) / 1000);
                if (duration > 0) {
                    await saveVoiceStats(client, guildId, userId, session.channelId, duration);
                }
                client.voiceSessions.delete(userId);
            }
        } else if (wasEligible && nowEligible && oldState.channelId !== newState.channelId && newState.channelId) {
            if (session) {
                const duration = Math.floor((Date.now() - session.joinedAt) / 1000);
                if (duration > 0) {
                    await saveVoiceStats(client, guildId, userId, session.channelId, duration);
                }
            }
            client.voiceSessions.set(userId, {
                channelId: newState.channelId,
                joinedAt: Date.now()
            });
        }
    }
};

async function saveVoiceStats(client, guildId, userId, channelId, duration) {
    const currentHour = moment().hour();
    const guildConfig = await client.getSettings(guildId);

    const isUserFiltered = guildConfig.filteredUsers?.includes(userId) || false;
    const isChannelFiltered = guildConfig.filteredChannels?.includes(channelId) || false;

    const guildObj = client.guilds.cache.get(guildId);
    const memberObj = guildObj?.members.cache.get(userId);
    const isRoleFiltered =
        memberObj?.roles.cache.some((role) => guildConfig.filteredRoles?.includes(role.id)) || false;

    if (isUserFiltered || isChannelFiltered || isRoleFiltered) return;

    const channel = client.guilds.cache.get(guildId)?.channels.cache.get(channelId);
    const parentId = channel?.parentId;

    let categoryKey = "other";
    if (guildConfig.voiceCategories) {
        for (const [key, category] of guildConfig.voiceCategories.entries()) {
            if (
                category.channels.includes(channelId) ||
                (parentId && category.channels.includes(parentId))
            ) {
                categoryKey = key;
                break;
            }
        }
    }

    try {
        await client.db.findOneAndUpdate(
            { guildID: guildId, userID: userId },
            {
                $inc: {
                    "voiceActive.daily": duration,
                    "voiceActive.weekly": duration,
                    "voiceActive.monthly": duration,
                    "voiceActive.total": duration,
                    [`voiceChannels.${channelId}`]: duration,
                    [`voiceCategories.${categoryKey}`]: duration,
                    [`hourlyVoice.${currentHour}`]: duration
                }
            },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error("[Veritabani Hata] Ses suresi kaydedilemedi:", err);
    }
}
