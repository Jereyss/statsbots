const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const moment = require("moment");
require("moment-duration-format");

module.exports = {
    name: "stats",
    aliases: ["stat", "me", "istatistik"],
    description: "Istatistiklerinizi cam kaplamali kart uzerinde gosterir.",
    usage: "stats [@kullanici]",
    execute: async (client, message, args) => {
        let targetMember = message.mentions.members?.first();
        if (!targetMember && args[0]) {
            targetMember = await message.guild?.members.fetch(args[0]).catch(() => undefined);
        }
        if (!targetMember) targetMember = message.member;

        const targetUser = targetMember.user;
        const guildId = message.guild.id;

        const waitMsg = await message.reply(`${client.emoji("loading") || "⏳"} **Gorsel istatistik kartiniz hazirlaniyor...**`);

        let statDoc = await client.db.findOne({ guildID: guildId, userID: targetUser.id });
        if (!statDoc) {
            statDoc = new client.db({
                guildID: guildId, userID: targetUser.id,
                voiceActive: { daily: 0, weekly: 0, monthly: 0, total: 0 },
                messageActive: { daily: 0, weekly: 0, monthly: 0, total: 0 },
                voiceChannels: new Map(), voiceCategories: new Map(),
                messageChannels: new Map(), hourlyVoice: Array(24).fill(0), dailyHistory: []
            });
        }

        let liveVoiceDuration = 0;
        let activeChannelId = "";
        const session = client.voiceSessions.get(targetUser.id);

        if (session && targetMember.voice.channel && !targetMember.voice.selfDeaf && !targetMember.voice.serverDeaf && targetMember.voice.channelId !== message.guild?.afkChannelId) {
            liveVoiceDuration = Math.floor((Date.now() - session.joinedAt) / 1000);
            activeChannelId = targetMember.voice.channelId;
        }

        const voiceChannelsMap = new Map(statDoc.voiceChannels);
        if (liveVoiceDuration > 0 && activeChannelId) {
            const currentDuration = voiceChannelsMap.get(activeChannelId) || 0;
            voiceChannelsMap.set(activeChannelId, currentDuration + liveVoiceDuration);
        }

        const voiceChannelsList = Array.from(voiceChannelsMap.entries())
            .map(([id, dur]) => {
                const ch = message.guild?.channels.cache.get(id);
                return { name: ch ? ch.name : "Silinmis Ses Kanali", duration: dur };
            })
            .sort((a, b) => b.duration - a.duration);

        const messageChannelsList = Array.from(new Map(statDoc.messageChannels).entries())
            .map(([id, count]) => {
                const ch = message.guild?.channels.cache.get(id);
                return { name: ch ? ch.name : "Silinmis Kanal", count };
            })
            .sort((a, b) => b.count - a.count);

        const dailyHistory = (statDoc.dailyHistory || []).map((h) => ({
            date: h.date, voice: h.voice || 0, messages: h.messages || 0
        }));

        const todayStr = moment().format("YYYY-MM-DD");
        const todayEntry = dailyHistory.find((h) => h.date === todayStr);
        if (todayEntry) {
            todayEntry.voice += liveVoiceDuration;
        } else {
            dailyHistory.push({ date: todayStr, voice: liveVoiceDuration, messages: statDoc.messageActive.daily });
        }

        const userStatus = targetMember.presence ? targetMember.presence.status : "offline";
        const currentHour = moment().hour();
        const hourlyVoice = [...(statDoc.hourlyVoice || Array(24).fill(0))];
        if (liveVoiceDuration > 0) {
            hourlyVoice[currentHour] = (hourlyVoice[currentHour] || 0) + liveVoiceDuration;
        }

        let cardBuffer;
        try {
            cardBuffer = await client.canvas.drawStatsCard({
                displayName: targetMember.displayName,
                tag: targetUser.tag,
                avatarUrl: targetUser.displayAvatarURL({ extension: "png", size: 256 }),
                status: userStatus,
                voiceActive: {
                    daily: statDoc.voiceActive.daily + liveVoiceDuration,
                    weekly: statDoc.voiceActive.weekly + liveVoiceDuration,
                    monthly: statDoc.voiceActive.monthly + liveVoiceDuration,
                    total: statDoc.voiceActive.total + liveVoiceDuration
                },
                voiceChannels: voiceChannelsList,
                messageActive: {
                    daily: statDoc.messageActive.daily,
                    weekly: statDoc.messageActive.weekly,
                    monthly: statDoc.messageActive.monthly,
                    total: statDoc.messageActive.total
                },
                messageChannels: messageChannelsList,
                dailyHistory: dailyHistory,
                hourlyVoice: hourlyVoice
            }, 1);
        } catch (drawError) {
            console.error("[Stats Command] Canvas cizim hatasi:", drawError);
            return waitMsg.edit("❌ Istatistik kartiniz olusturulurken hata meydana geldi!");
        }

        const attachment = new AttachmentBuilder(cardBuffer, { name: `${targetUser.username}_istatistik.png` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`stats_daily_${targetUser.id}`).setLabel("Gunluk").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`stats_weekly_${targetUser.id}`).setLabel("Haftalik").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`stats_monthly_${targetUser.id}`).setLabel("Aylik").setStyle(ButtonStyle.Secondary)
        );

        await waitMsg.delete().catch(() => {});
        const replyMsg = await message.reply({ files: [attachment], components: [row] });

        const collector = replyMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on("collect", async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: "❌ Bu istatistik kartini sadece komutu tetikleyen kisi degistirebilir!", ephemeral: true });
            }

            await interaction.deferUpdate();

            let days = 1;
            if (interaction.customId.startsWith("stats_weekly")) days = 7;
            else if (interaction.customId.startsWith("stats_monthly")) days = 30;

            let updatedBuffer;
            try {
                updatedBuffer = await client.canvas.drawStatsCard({
                    displayName: targetMember.displayName,
                    tag: targetUser.tag,
                    avatarUrl: targetUser.displayAvatarURL({ extension: "png", size: 256 }),
                    status: userStatus,
                    voiceActive: {
                        daily: statDoc.voiceActive.daily + liveVoiceDuration,
                        weekly: statDoc.voiceActive.weekly + liveVoiceDuration,
                        monthly: statDoc.voiceActive.monthly + liveVoiceDuration,
                        total: statDoc.voiceActive.total + liveVoiceDuration
                    },
                    voiceChannels: voiceChannelsList,
                    messageActive: {
                        daily: statDoc.messageActive.daily,
                        weekly: statDoc.messageActive.weekly,
                        monthly: statDoc.messageActive.monthly,
                        total: statDoc.messageActive.total
                    },
                    messageChannels: messageChannelsList,
                    dailyHistory: dailyHistory,
                    hourlyVoice: hourlyVoice
                }, days);
            } catch (drawError) {
                console.error("[Stats Command] Interaktif Canvas cizim hatasi:", drawError);
                return;
            }

            const updatedAttachment = new AttachmentBuilder(updatedBuffer, { name: `${targetUser.username}_istatistik.png` });
            await replyMsg.edit({ files: [updatedAttachment], components: [row] });
        });

        collector.on("end", async () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("stats_daily_disabled").setLabel("Gunluk").setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId("stats_weekly_disabled").setLabel("Haftalik").setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId("stats_monthly_disabled").setLabel("Aylik").setStyle(ButtonStyle.Secondary).setDisabled(true)
            );
            await replyMsg.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};
