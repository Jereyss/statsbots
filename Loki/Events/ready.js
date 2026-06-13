const { ActivityType } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");
const { initializeDatabase } = require("../../Global/Database/db.js");
const moment = require("moment");

module.exports = {
    name: "ready",
    once: true,
    execute: async (client) => {
        console.log(`[Loki BOT] ${client.user.tag} olarak giris yapildi!`);

        try {
            await initializeDatabase();
            console.log("[Neon DB] Basariyla veritabanina baglandi!");
        } catch (err) {
            console.error("[Neon DB] Baglanti hatasi:", err);
        }

        const guildConfig = await client.getSettings(client.config.GuildID);

        client.invites = new Map();
        try {
            const guild = client.guilds.cache.get(client.config.GuildID);
            if (guild) {
                const invites = await guild.invites.fetch();
                const inviteCache = new Map();
                invites.forEach((inv) => {
                    inviteCache.set(inv.code, inv.uses);
                });
                client.invites.set(guild.id, inviteCache);
            }
        } catch (err) {
            console.error("[Davet Takip] Davetler onbellege alinirken hata:", err);
        }

        client.user.setPresence({
            activities: [{
                name: guildConfig.activityName,
                type: ActivityType.Streaming,
                url: guildConfig.twitchURL
            }],
            status: "online"
        });

        const voiceChannelId = guildConfig.botVoiceChannelID;
        if (voiceChannelId) {
            const channel = client.channels.cache.get(voiceChannelId);
            if (channel && channel.isVoiceBased()) {
                try {
                    joinVoiceChannel({
                        channelId: channel.id,
                        guildId: channel.guild.id,
                        adapterCreator: channel.guild.voiceAdapterCreator,
                        selfMute: false,
                        selfDeaf: true
                    });
                    console.log(`[Ses Baglantisi] Bot '${channel.name}' ses kanalina giris yapti.`);
                } catch (err) {
                    console.error("[Ses Baglantisi] Ses kanalina girerken hata:", err);
                }
            } else {
                console.warn(`[Ses Baglantisi] Ses kanali ID'si (${voiceChannelId}) bulunamadi!`);
            }
        }

        let lastCheckedDate = moment().format("YYYY-MM-DD");

        setInterval(async () => {
            const currentDate = moment().format("YYYY-MM-DD");
            if (currentDate !== lastCheckedDate) {
                console.log(`[Sistem] Gun degisti (${lastCheckedDate} -> ${currentDate}). Istatistikler sifirlanıyor...`);

                try {
                    const allStats = await client.db.find({
                        $or: [
                            { "voiceActive.daily": { $gt: 0 } },
                            { "messageActive.daily": { $gt: 0 } }
                        ]
                    });

                    for (const stat of allStats) {
                        const yesterdayVoice = stat.voiceActive.daily;
                        const yesterdayMessages = stat.messageActive.daily;

                        const history = stat.dailyHistory || [];
                        history.push({
                            date: lastCheckedDate,
                            voice: yesterdayVoice,
                            messages: yesterdayMessages
                        });

                        if (history.length > 30) history.shift();

                        stat.dailyHistory = history;
                        stat.voiceActive.daily = 0;
                        stat.messageActive.daily = 0;

                        if (moment().day() === 1) {
                            stat.voiceActive.weekly = 0;
                            stat.messageActive.weekly = 0;
                        }

                        if (moment().date() === 1) {
                            stat.voiceActive.monthly = 0;
                            stat.messageActive.monthly = 0;
                        }

                        stat.hourlyVoice = Array(24).fill(0);
                        await stat.save();
                    }

                    console.log(`[Sistem] ${allStats.length} kullanicinin istatistik devir islemi tamamlandi.`);
                    lastCheckedDate = currentDate;
                } catch (error) {
                    console.error("[Sistem] Istatistik sifirlama hata:", error);
                }
            }
        }, 1000 * 60 * 5);
    }
};
