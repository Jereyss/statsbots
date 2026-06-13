import { Message, ChannelType, AttachmentBuilder } from "discord.js";
import { CanvasHelper } from "../../../Global/Utils/CanvasHelper";

export default {
    name: "channel",
    aliases: ["kanal", "kanalstats", "kanalgörüntüle"],
    description: "Belirli bir kanalın istatistik özetini görüntüler.",
    usage: "channel [#metin-kanali / ses-kanali-id]",
    execute: async (client: any, message: Message, args: string[]) => {
        const guild = message.guild!;
        const guildId = guild.id;

        // 1. Hedef Kanalı Tespit Et
        let channel = message.mentions.channels.first();
        if (!channel && args[0]) {
            // ID veya isme göre bulmaya çalışalım
            channel = guild.channels.cache.get(args[0]) || 
                      guild.channels.cache.find(c => (c as any).name.toLowerCase() === args[0].toLowerCase());
        }
        // Eğer hiçbir kanal girilmediyse, üzerinde bulunulan metin kanalı varsayılan olur
        if (!channel) {
            channel = message.channel;
        }

        const isVoice = channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice;

        const waitMsg = await message.reply(`⏳ **${(channel as any).name}** kanal istatistik paneli hazırlanıyor, lütfen bekleyin...`);

        try {
            // 2. Veritabanı verilerini topla (Mongoose .lean() ile performanslı arama)
            const allStats = await client.db.find(
                { guildID: guildId },
                { 
                    userID: 1, 
                    voiceChannels: 1, 
                    messageChannels: 1 
                }
            ).lean();

            let totalChannelValue = 0;
            let serverTotalValue = 0;
            const userContributions: { userID: string; value: number }[] = [];

            const channelId = channel.id;

            for (const stat of allStats) {
                if (isVoice) {
                    // Ses kanalı için topla (Map veya Object durumuna karşı korumalı)
                    const voiceChannelsObj = stat.voiceChannels || {};
                    const entries = voiceChannelsObj instanceof Map 
                        ? voiceChannelsObj.entries() 
                        : Object.entries(voiceChannelsObj);
                    
                    for (const [chanId, val] of entries) {
                        serverTotalValue += val as number;
                        if (chanId === channelId) {
                            totalChannelValue += val as number;
                            userContributions.push({ userID: stat.userID, value: val as number });
                        }
                    }
                } else {
                    // Metin kanalı için topla
                    const messageChannelsObj = stat.messageChannels || {};
                    const entries = messageChannelsObj instanceof Map 
                        ? messageChannelsObj.entries() 
                        : Object.entries(messageChannelsObj);

                    for (const [chanId, val] of entries) {
                        serverTotalValue += val as number;
                        if (chanId === channelId) {
                            totalChannelValue += val as number;
                            userContributions.push({ userID: stat.userID, value: val as number });
                        }
                    }
                }
            }

            // Katılım Oranı
            const serverPercentage = serverTotalValue > 0 
                ? ((totalChannelValue / serverTotalValue) * 100).toFixed(1) 
                : "0.0";

            // En aktif 5 katılımcıyı bul
            const top5Users = userContributions
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);

            const resolvedUsers = [];
            for (const u of top5Users) {
                const memberObj = guild.members.cache.get(u.userID) || 
                                  await guild.members.fetch(u.userID).catch(() => null);
                resolvedUsers.push({
                    name: memberObj ? memberObj.displayName : `Uye (${u.userID.substring(0, 5)})`,
                    avatarUrl: memberObj 
                        ? memberObj.user.displayAvatarURL({ extension: "png", size: 64 })
                        : "https://cdn.discordapp.com/embed/avatars/0.png",
                    value: u.value
                });
            }

            const categoryName = (channel as any).parent ? (channel as any).parent.name : "Kategorisiz";

            // 3. Görsel Kartı Çiz
            const channelBuffer = await CanvasHelper.drawChannelCard({
                channelName: (channel as any).name,
                categoryName,
                isVoice,
                totalValue: totalChannelValue,
                serverPercentage,
                topUsers: resolvedUsers
            });

            const attachment = new AttachmentBuilder(channelBuffer, { name: "loki_channel_stats.png" });

            await waitMsg.delete().catch(() => {});
            await message.reply({
                files: [attachment]
            });

        } catch (err) {
            console.error("[Channel Command] Kanal kartı oluşturulurken hata:", err);
            await waitMsg.edit("❌ Kanal istatistik paneli yüklenirken teknik bir hata oluştu!").catch(() => {});
        }
    }
};
