import { Message, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import moment from "moment";
import "moment-duration-format";

export default {
    name: "stats",
    aliases: ["stat", "me", "istatistik"],
    description: "İstatistiklerinizi cam kaplamalı (Glassmorphic) kart üzerinde gösterir.",
    usage: "stats [@kullanici]",
    execute: async (client: any, message: Message, args: string[]) => {
        // Hedef kullanıcıyı belirle (etiketlenen veya komutu yazan kişi)
        let targetMember = message.mentions.members?.first();
        if (!targetMember && args[0]) {
            targetMember = await message.guild?.members.fetch(args[0]).catch(() => undefined);
        }
        if (!targetMember) targetMember = message.member!;

        const targetUser = targetMember.user;
        const guildId = message.guild!.id;

        // "İstatistikler Hesaplanıyor..." ön yükleme mesajı gönder
        const waitMsg = await message.reply(`${client.emoji("loading") || "⏳"} **Görsel istatistik kartınız hazırlanıyor, lütfen bekleyin...**`);

        // Hedef kullanıcının veritabanı verilerini çek (client.db üzerinden)
        let statDoc = await client.db.findOne({ guildID: guildId, userID: targetUser.id });
        if (!statDoc) {
            // Verisi yoksa varsayılan boş bir veri şablonu oluşturalım
            statDoc = new client.db({
                guildID: guildId,
                userID: targetUser.id,
                voiceActive: { daily: 0, weekly: 0, monthly: 0, total: 0 },
                messageActive: { daily: 0, weekly: 0, monthly: 0, total: 0 },
                voiceChannels: new Map(),
                voiceCategories: new Map(),
                messageChannels: new Map(),
                hourlyVoice: Array(24).fill(0),
                dailyHistory: []
            });
        }

        // --- GERÇEK ZAMANLI SES HESAPLAMA SİSTEMİ ---
        // Eğer kullanıcı şu an seste ise ve istatistik kazanmaya uygunsa, veritabanına henüz yazılmamış olan süreyi saniyesine kadar anlık hesaplayalım!
        let liveVoiceDuration = 0;
        let activeChannelId = "";
        const session = client.voiceSessions.get(targetUser.id);
        
        if (session && targetMember.voice.channel && !targetMember.voice.selfDeaf && !targetMember.voice.serverDeaf && targetMember.voice.channelId !== message.guild?.afkChannelId) {
            liveVoiceDuration = Math.floor((Date.now() - session.joinedAt) / 1000);
            activeChannelId = targetMember.voice.channelId!;
        }

        // Toplam ses ve mesaj sürelerini anlık verilerle birleştirip formatla
        const totalVoiceSeconds = statDoc.voiceActive.total + liveVoiceDuration;
        const dailyVoiceSeconds = statDoc.voiceActive.daily + liveVoiceDuration;
        const totalMessages = statDoc.messageActive.total;
        const dailyMessages = statDoc.messageActive.daily;

        const formatDuration = (seconds: number) => {
            return (moment.duration(seconds, "seconds") as any).format("H [saat] m [dakika]");
        };

        // En çok vakit geçirilen ses kanallarını eşleştirip sıralayalım
        const voiceChannelsMap = new Map<string, number>(statDoc.voiceChannels as any);
        if (liveVoiceDuration > 0 && activeChannelId) {
            const currentDuration = voiceChannelsMap.get(activeChannelId) || 0;
            voiceChannelsMap.set(activeChannelId, currentDuration + liveVoiceDuration);
        }

        const voiceChannelsList = Array.from(voiceChannelsMap.entries())
            .map(([id, dur]) => {
                const ch = message.guild?.channels.cache.get(id);
                return { name: ch ? ch.name : "Silinmiş Ses Kanalı", duration: dur as number };
            })
            .sort((a, b) => (b.duration as number) - (a.duration as number));

        // En çok yazılan mesaj kanallarını sıralayalım
        const messageChannelsList = Array.from(new Map<string, number>(statDoc.messageChannels as any).entries())
            .map(([id, count]) => {
                const ch = message.guild?.channels.cache.get(id);
                return { name: ch ? ch.name : "Silinmiş Kanal", count: count as number };
            })
            .sort((a, b) => (b.count as number) - (a.count as number));

        // 7 Günlük Aktivite Geçmişi verilerini derleyelim
        const dailyHistory = (statDoc.dailyHistory || []).map((h: any) => ({
            date: h.date,
            voice: h.voice || 0,
            messages: h.messages || 0
        }));

        // Bugünün canlı verisini bugünün tarihine ekleyelim/birleştirelim
        const todayStr = moment().format("YYYY-MM-DD");
        const todayEntry = dailyHistory.find((h: any) => h.date === todayStr);
        if (todayEntry) {
            todayEntry.voice += liveVoiceDuration;
        } else {
            dailyHistory.push({
                date: todayStr,
                voice: liveVoiceDuration,
                messages: statDoc.messageActive.daily
            });
        }

        // Kullanıcının discord durumunu güvenli şekilde alalım (online, idle, dnd, offline)
        const userStatus = targetMember.presence ? targetMember.presence.status : "offline";

        // Bugünün saatlik ses verilerini hazırlayıp canlı süreyi de ekleyelim
        const currentHour = moment().hour();
        const hourlyVoice = [...(statDoc.hourlyVoice || Array(24).fill(0))];
        if (liveVoiceDuration > 0) {
            hourlyVoice[currentHour] = (hourlyVoice[currentHour] || 0) + liveVoiceDuration;
        }

        // --- 🎨 CANVAS KART RESMİNİ ÇİZ (client.canvas üzerinden) 🎨 ---
        // Varsayılan olarak 1 Günlük (Saatlik Son 24 Saat) kartı ile başlıyoruz (En minimalist ve dinamik görünüm)
        let cardBuffer: Buffer;
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
            console.error("[Stats Command] Canvas çizim hatası:", drawError);
            return waitMsg.edit("❌ İstatistik kartınız oluşturulurken grafiksel bir hata meydana geldi!");
        }

        const attachment = new AttachmentBuilder(cardBuffer, { name: `${targetUser.username}_istatistik.png` });

        // İnteraktif Butonlar: Günlük, Haftalık ve Aylık (Tamamen emojisiz, sade metin ve gri renkli - Secondary)
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`stats_daily_${targetUser.id}`)
                .setLabel("Günlük")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`stats_weekly_${targetUser.id}`)
                .setLabel("Haftalık")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`stats_monthly_${targetUser.id}`)
                .setLabel("Aylık")
                .setStyle(ButtonStyle.Secondary)
        );

        // Önceki yükleniyor mesajını silip resmi butonlarla gönderelim
        await waitMsg.delete().catch(() => {});
        const replyMsg = await message.reply({
            files: [attachment],
            components: [row]
        });

        // 60 saniye boyunca buton etkileşimlerini topla
        const collector = replyMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on("collect", async (interaction) => {
            // Yalnızca komutu yazan kişi değiştirebilsin
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: "❌ Bu istatistik kartını sadece komutu tetikleyen kişi değiştirebilir!", ephemeral: true });
            }

            await interaction.deferUpdate();

            let days = 1;
            if (interaction.customId.startsWith("stats_weekly")) {
                days = 7;
            } else if (interaction.customId.startsWith("stats_monthly")) {
                days = 30;
            }

            // Seçilen güne göre kartı yeniden çiz
            let updatedBuffer: Buffer;
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
                console.error("[Stats Command] İnteraktif Canvas çizim hatası:", drawError);
                return;
            }

            const updatedAttachment = new AttachmentBuilder(updatedBuffer, { name: `${targetUser.username}_istatistik.png` });

            await replyMsg.edit({
                files: [updatedAttachment],
                components: [row]
            });
        });

        collector.on("end", async () => {
            // Butonları süre bittiğinde devre dışı bırak
            const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(`stats_daily_disabled`)
                    .setLabel("Günlük")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`stats_weekly_disabled`)
                    .setLabel("Haftalık")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`stats_monthly_disabled`)
                    .setLabel("Aylık")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
            await replyMsg.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};
