const { ChannelType, AttachmentBuilder } = require("discord.js");
const { CanvasHelper } = require("../../../Global/Utils/CanvasHelper");

module.exports = {
    name: "channel",
    aliases: ["kanal", "kanalstats"],
    description: "Belirli bir kanalin istatistik ozetini goruntulur.",
    usage: "channel [#metin-kanali / ses-kanali-id]",
    execute: async (client, message, args) => {
        const guild = message.guild;
        const guildId = guild.id;

        let channel = message.mentions.channels.first();
        if (!channel && args[0]) {
            channel = guild.channels.cache.get(args[0]) ||
                guild.channels.cache.find((c) => c.name.toLowerCase() === args[0].toLowerCase());
        }
        if (!channel) channel = message.channel;

        const isVoice = channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice;
        const waitMsg = await message.reply(`⏳ **${channel.name}** kanal istatistik paneli hazirlaniyor...`);

        try {
            const allStats = await client.db.find(
                { guildID: guildId },
                { userID: 1, voiceChannels: 1, messageChannels: 1 }
            ).lean();

            let totalChannelValue = 0;
            let serverTotalValue = 0;
            const userContributions = [];
            const channelId = channel.id;

            for (const stat of allStats) {
                if (isVoice) {
                    const voiceChannelsObj = stat.voiceChannels || {};
                    const entries = voiceChannelsObj instanceof Map
                        ? voiceChannelsObj.entries()
                        : Object.entries(voiceChannelsObj);
                    for (const [chanId, val] of entries) {
                        serverTotalValue += val;
                        if (chanId === channelId) {
                            totalChannelValue += val;
                            userContributions.push({ userID: stat.userID, value: val });
                        }
                    }
                } else {
                    const messageChannelsObj = stat.messageChannels || {};
                    const entries = messageChannelsObj instanceof Map
                        ? messageChannelsObj.entries()
                        : Object.entries(messageChannelsObj);
                    for (const [chanId, val] of entries) {
                        serverTotalValue += val;
                        if (chanId === channelId) {
                            totalChannelValue += val;
                            userContributions.push({ userID: stat.userID, value: val });
                        }
                    }
                }
            }

            const serverPercentage = serverTotalValue > 0
                ? ((totalChannelValue / serverTotalValue) * 100).toFixed(1)
                : "0.0";

            const top5Users = userContributions.sort((a, b) => b.value - a.value).slice(0, 5);
            const resolvedUsers = [];
            for (const u of top5Users) {
                const memberObj = guild.members.cache.get(u.userID) || await guild.members.fetch(u.userID).catch(() => null);
                resolvedUsers.push({
                    name: memberObj ? memberObj.displayName : `Uye (${u.userID.substring(0, 5)})`,
                    avatarUrl: memberObj ? memberObj.user.displayAvatarURL({ extension: "png", size: 64 }) : "https://cdn.discordapp.com/embed/avatars/0.png",
                    value: u.value
                });
            }

            const categoryName = channel.parent ? channel.parent.name : "Kategorisiz";

            const channelBuffer = await CanvasHelper.drawChannelCard({
                channelName: channel.name, categoryName, isVoice,
                totalValue: totalChannelValue, serverPercentage, topUsers: resolvedUsers
            });

            const attachment = new AttachmentBuilder(channelBuffer, { name: "loki_channel_stats.png" });
            await waitMsg.delete().catch(() => {});
            await message.reply({ files: [attachment] });
        } catch (err) {
            console.error("[Channel Command] Kanal karti olusturulurken hata:", err);
            await waitMsg.edit("❌ Kanal istatistik paneli yuklenirken hata olustu!").catch(() => {});
        }
    }
};
