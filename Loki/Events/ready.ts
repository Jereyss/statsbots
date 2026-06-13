import { Client, ActivityType } from "discord.js";
import mongoose from "mongoose";
import { joinVoiceChannel } from "@discordjs/voice";
import moment from "moment";

export default {
    name: "ready",
    once: true,
    execute: async (client: any) => {
        console.log(`[Loki BOT] ${client.user.tag} olarak giriş yapıldı!`);

        // MongoDB Bağlantısı (Client Konteyner üzerinden)
        try {
            mongoose.set("strictQuery", true);
            await mongoose.connect(client.config.MongoURI);
            console.log("[MongoDB] Başarıyla veritabanına bağlanıldı!");
        } catch (err) {
            console.error("[MongoDB] Bağlantı hatası:", err);
        }

        // Sunucu ayar kaydını Konteyner üzerinden alalım
        const guildConfig = await client.getSettings(client.config.GuildID);

        // --- DAVET TAKIP SISTEMI ONBELLEK ILKLENDIRME ---
        client.invites = new Map();
        try {
            const guild = client.guilds.cache.get(client.config.GuildID);
            if (guild) {
                const invites = await guild.invites.fetch();
                const inviteCache = new Map();
                invites.forEach((inv: any) => {
                    inviteCache.set(inv.code, inv.uses);
                });
                client.invites.set(guild.id, inviteCache);
            }
        } catch (err) {
            console.error("[Davet Takip] Davetler onbellege alinirken hata (Yetki eksik olabilir):", err);
        }

        // Durum (Presence) Ayarlama - Dinamik Twitch Yayında Bağlantısı
        client.user.setPresence({
            activities: [{ 
                name: guildConfig.activityName, 
                type: ActivityType.Streaming, 
                url: guildConfig.twitchURL // Veritabanından gelen Twitch linki
            }],
            status: "online"
        });

        // Otomatik Ses Kanalına Giriş Sistemi (Dinamik GuildConfig üzerinden)
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
                    console.log(`[Ses Bağlantısı] Bot başarıyla '${channel.name}' ses kanalına giriş yaptı ve yerleşti.`);
                } catch (err) {
                    console.error("[Ses Bağlantısı] Ses kanalına girerken teknik hata oluştu:", err);
                }
            } else {
                console.warn(`[Ses Bağlantısı] Kurulumda tanımlanan ses kanalı ID'si (${voiceChannelId}) bulunamadı veya geçerli değil!`);
            }
        }

        // Günlük/Haftalık/Aylık Sıfırlama ve Tarih Taşıma Kontrolü
        let lastCheckedDate = moment().format("YYYY-MM-DD");

        setInterval(async () => {
            const currentDate = moment().format("YYYY-MM-DD");
            if (currentDate !== lastCheckedDate) {
                console.log(`[Sistem] Gün değişti (${lastCheckedDate} -> ${currentDate}). İstatistikler taşınıyor ve sıfırlanıyor...`);
                
                try {
                    // client.db konteyner modelini kullanıyoruz
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

                        if (history.length > 30) {
                            history.shift();
                        }

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

                    console.log(`[Sistem] ${allStats.length} kullanıcının istatistik devir işlemi başarıyla tamamlandı.`);
                    lastCheckedDate = currentDate;
                } catch (error) {
                    console.error("[Sistem] İstatistik sıfırlama ve taşıma işleminde hata oluştu:", error);
                }
            }
        }, 1000 * 60 * 5); // Her 5 dakikada bir kontrol et
    }
};
