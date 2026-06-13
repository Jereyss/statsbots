const { AttachmentBuilder } = require("discord.js");
const { CanvasHelper } = require("../../../Global/Utils/CanvasHelper");
const moment = require("moment");

module.exports = {
    name: "server",
    aliases: ["sunucu", "serverstats"],
    description: "Sunucu istatistiklerinin genel bir ozetini goruntuler.",
    usage: "server",
    execute: async (client, message, args) => {
        const guild = message.guild;
        const guildId = guild.id;
        const waitMsg = await message.reply("⏳ **Sunucu istatistik paneli hazirlaniyor...**");

        try {
            const owner = await guild.fetchOwner().catch(() => null);
            const ownerName = owner ? owner.user.tag : "Bilinmiyor";
            const createdAt = moment(guild.createdAt).format("DD.MM.YYYY");
            const boostCount = guild.premiumSubscriptionCount || 0;
            const boostLevel = guild.premiumTier || 0;
            const memberCount = guild.memberCount;
            const serverIconUrl = guild.iconURL({ extension: "png", size: 256 }) || "https://cdn.discordapp.com/embed/avatars/0.png";

            const allStats = await client.db.find(
                { guildID: guildId },
                { userID: 1, "voiceActive.total": 1, "messageActive.total": 1, voiceChannels: 1, messageChannels: 1 }
            ).lean();

            let totalVoiceSeconds = 0;
            let totalMessages = 0;
            const voiceChannelTotals = new Map();
            const messageChannelTotals = new Map();
            const userVoiceList = [];
            const userMessageList = [];

            for (const stat of allStats) {
                const voiceVal = stat.voiceActive?.total || 0;
                const msgVal = stat.messageActive?.total || 0;
                totalVoiceSeconds += voiceVal;
                totalMessages += msgVal;

                if (voiceVal > 0) userVoiceList.push({ userID: stat.userID, value: voiceVal });
                if (msgVal > 0) userMessageList.push({ userID: stat.userID, value: msgVal });

                if (stat.voiceChannels) {
                    const entries = stat.voiceChannels instanceof Map
                        ? stat.voiceChannels.entries()
                        : Object.entries(stat.voiceChannels);
                    for (const [chanId, val] of entries) {
                        voiceChannelTotals.set(chanId, (voiceChannelTotals.get(chanId) || 0) + val);
                    }
                }
                if (stat.messageChannels) {
                    const entries = stat.messageChannels instanceof Map
                        ? stat.messageChannels.entries()
                        : Object.entries(stat.messageChannels);
                    for (const [chanId, val] of entries) {
                        messageChannelTotals.set(chanId, (messageChannelTotals.get(chanId) || 0) + val);
                    }
                }
            }

            let topVoiceChannelID = ""; let topVoiceChannelVal = 0;
            for (const [chanId, val] of voiceChannelTotals.entries()) {
                if (val > topVoiceChannelVal) { topVoiceChannelVal = val; topVoiceChannelID = chanId; }
            }
            let topMessageChannelID = ""; let topMessageChannelVal = 0;
            for (const [chanId, val] of messageChannelTotals.entries()) {
                if (val > topMessageChannelVal) { topMessageChannelVal = val; topMessageChannelID = chanId; }
            }

            const topVoiceChannelName = topVoiceChannelID
                ? (guild.channels.cache.get(topVoiceChannelID)?.name || `kanal-${topVoiceChannelID}`)
                : "Yok";
            const topMessageChannelName = topMessageChannelID
                ? (guild.channels.cache.get(topMessageChannelID)?.name || `kanal-${topMessageChannelID}`)
                : "Yok";

            const topVoiceUsers = userVoiceList.sort((a, b) => b.value - a.value).slice(0, 3);
            const topMessageUsers = userMessageList.sort((a, b) => b.value - a.value).slice(0, 3);

            const resolvedVoiceUsers = [];
            for (const u of topVoiceUsers) {
                const memberObj = guild.members.cache.get(u.userID) || await guild.members.fetch(u.userID).catch(() => null);
                resolvedVoiceUsers.push({
                    name: memberObj ? memberObj.displayName : `Uye (${u.userID.substring(0, 5)})`,
                    avatarUrl: memberObj ? memberObj.user.displayAvatarURL({ extension: "png", size: 64 }) : "https://cdn.discordapp.com/embed/avatars/0.png",
                    value: u.value
                });
            }

            const resolvedMessageUsers = [];
            for (const u of topMessageUsers) {
                const memberObj = guild.members.cache.get(u.userID) || await guild.members.fetch(u.userID).catch(() => null);
                resolvedMessageUsers.push({
                    name: memberObj ? memberObj.displayName : `Uye (${u.userID.substring(0, 5)})`,
                    avatarUrl: memberObj ? memberObj.user.displayAvatarURL({ extension: "png", size: 64 }) : "https://cdn.discordapp.com/embed/avatars/0.png",
                    value: u.value
                });
            }

            const serverBuffer = await CanvasHelper.drawServerCard({
                serverName: guild.name, serverIconUrl, ownerName, createdAt,
                boostCount, boostLevel, memberCount, totalVoiceSeconds, totalMessages,
                topVoiceChannel: { name: topVoiceChannelName, value: topVoiceChannelVal },
                topMessageChannel: { name: topMessageChannelName, value: topMessageChannelVal },
                topVoiceUsers: resolvedVoiceUsers, topMessageUsers: resolvedMessageUsers
            });

            const attachment = new AttachmentBuilder(serverBuffer, { name: "loki_server_stats.png" });
            await waitMsg.delete().catch(() => {});
            await message.reply({ files: [attachment] });
        } catch (err) {
            console.error("[Server Command] Sunucu karti olusturulurken hata:", err);
            await waitMsg.edit("❌ Sunucu istatistik paneli yuklenirken hata olustu!").catch(() => {});
        }
    }
};
