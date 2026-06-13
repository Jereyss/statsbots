const { AttachmentBuilder } = require("discord.js");
const { CanvasHelper } = require("../../../Global/Utils/CanvasHelper");

module.exports = {
    name: "aktifses",
    aliases: ["voicelist", "sestekiler", "aktifodalar", "aktifsesler"],
    description: "Sunucudaki anlik ses odasi aktiflik durumunu gosteren canli gosterge karti.",
    usage: "aktifses",
    execute: async (client, message, args) => {
        const guildId = message.guild.id;
        const waitMsg = await message.reply(`${client.emoji("loading") || "⏳"} **Canli ses aktiflik tablosu hazirlaniyor...**`);

        try {
            const channelsMap = new Map();
            let totalInVoice = 0;

            message.guild.channels.cache.forEach((ch) => {
                if (ch.isVoiceBased()) {
                    const members = ch.members.filter((m) => !m.user.bot);
                    if (members.size > 0) {
                        totalInVoice += members.size;
                        const usersList = members.map((m) => {
                            const session = client.voiceSessions.get(m.id);
                            let seconds = 0;
                            if (session) seconds = Math.floor((Date.now() - session.joinedAt) / 1000);
                            return {
                                name: m.displayName || m.user.username,
                                avatarUrl: m.user.displayAvatarURL({ extension: "png", size: 64 }),
                                seconds
                            };
                        });
                        usersList.sort((a, b) => b.seconds - a.seconds);
                        channelsMap.set(ch.id, { name: ch.name, userCount: members.size, members: usersList });
                    }
                }
            });

            const channelsArray = Array.from(channelsMap.values()).sort((a, b) => b.userCount - a.userCount);
            const channelsData = channelsArray.map((c) => ({
                name: c.name, userCount: c.userCount, topUsers: c.members
            }));

            const activeVoiceBuffer = await CanvasHelper.drawActiveVoiceCard({
                serverName: message.guild.name, totalInVoice,
                channelsCount: channelsArray.length, channels: channelsData
            });

            const attachment = new AttachmentBuilder(activeVoiceBuffer, { name: "loki_live_voice_stats.png" });
            await waitMsg.delete().catch(() => {});
            await message.reply({ files: [attachment] });
        } catch (err) {
            console.error("[ActiveVoice Command] Hata:", err);
            await waitMsg.edit("❌ Canli ses aktiflik tablosu hazirlanirken hata olustu!").catch(() => {});
        }
    }
};
