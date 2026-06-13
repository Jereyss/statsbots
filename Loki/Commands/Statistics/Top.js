const { AttachmentBuilder } = require("discord.js");
const { CanvasHelper } = require("../../../Global/Utils/CanvasHelper");

module.exports = {
    name: "top",
    aliases: ["topstats", "siralama", "liderlik"],
    description: "Sunucu genelindeki en aktif ses ve mesaj kullanicilarin siralamasini gosterir.",
    usage: "top",
    execute: async (client, message, args) => {
        const guildId = message.guild.id;
        const waitMsg = await message.reply(`${client.emoji("loading") || "⏳"} **Sunucu genel siralama liderlik tablosu hazirlaniyor...**`);

        try {
            const allDocs = await client.db.find({ guildID: guildId });

            const mappedUsers = allDocs.map((doc) => {
                let liveVoiceDuration = 0;
                const session = client.voiceSessions.get(doc.userID);
                const member = message.guild.members.cache.get(doc.userID);
                if (session && member && member.voice.channel && !member.voice.selfDeaf && !member.voice.serverDeaf && member.voice.channelId !== message.guild?.afkChannelId) {
                    liveVoiceDuration = Math.floor((Date.now() - session.joinedAt) / 1000);
                }
                return {
                    userID: doc.userID,
                    voiceTotal: (doc.voiceActive?.total || 0) + liveVoiceDuration,
                    messageTotal: doc.messageActive?.total || 0
                };
            });

            const voiceSorted = [...mappedUsers].sort((a, b) => b.voiceTotal - a.voiceTotal);
            const voiceRank = [];
            for (const u of voiceSorted) {
                if (voiceRank.length >= 8) break;
                const member = await message.guild.members.fetch(u.userID).catch(() => null);
                if (!member) continue;
                if (u.voiceTotal <= 0) continue;
                voiceRank.push({
                    name: member.displayName || member.user.username,
                    avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 64 }),
                    value: u.voiceTotal
                });
            }

            const messageSorted = [...mappedUsers].sort((a, b) => b.messageTotal - a.messageTotal);
            const messageRank = [];
            for (const u of messageSorted) {
                if (messageRank.length >= 8) break;
                const member = await message.guild.members.fetch(u.userID).catch(() => null);
                if (!member) continue;
                if (u.messageTotal <= 0) continue;
                messageRank.push({
                    name: member.displayName || member.user.username,
                    avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 64 }),
                    value: u.messageTotal
                });
            }

            const topBuffer = await CanvasHelper.drawTopCard({ voiceRank, messageRank });
            const attachment = new AttachmentBuilder(topBuffer, { name: "loki_top_stats.png" });

            await waitMsg.delete().catch(() => {});
            await message.reply({ files: [attachment] });
        } catch (err) {
            console.error("[Top Command] Siralama tablosu olusturma hatasi:", err);
            await waitMsg.edit("❌ Sunucu genel liderlik siralamasi hazirlanirken hata olustu!").catch(() => {});
        }
    }
};
