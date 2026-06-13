import { Message, AttachmentBuilder } from "discord.js";
import { CanvasHelper } from "../../../Global/Utils/CanvasHelper";

export default {
    name: "top",
    aliases: ["topstats", "sıralama", "siralama", "liderlik"],
    description: "Sunucu genelindeki en aktif ses ve mesaj kullanıcılarının sıralamasını cam kaplamalı (Glassmorphic) kart üzerinde gösterir.",
    usage: "top",
    execute: async (client: any, message: Message, args: string[]) => {
        const guildId = message.guild!.id;

        // "Sıralama Hesaplanıyor..." ön yükleme mesajı gönder
        const waitMsg = await message.reply(`${client.emoji("loading") || "⏳"} **Sunucu genel sıralama liderlik tablosu hazırlanıyor, lütfen bekleyin...**`);

        try {
            // Sunucudaki tüm kayıtları veritabanından çek
            const allDocs = await client.db.find({ guildID: guildId });

            // Aktif canlı ses sürelerini hesaplayarak kullanıcıları haritalayalım
            const mappedUsers = allDocs.map((doc: any) => {
                let liveVoiceDuration = 0;
                const session = client.voiceSessions.get(doc.userID);
                const member = message.guild!.members.cache.get(doc.userID);
                
                if (session && member && member.voice.channel && !member.voice.selfDeaf && !member.voice.serverDeaf && member.voice.channelId !== message.guild?.afkChannelId) {
                    liveVoiceDuration = Math.floor((Date.now() - session.joinedAt) / 1000);
                }

                return {
                    userID: doc.userID,
                    voiceTotal: (doc.voiceActive?.total || 0) + liveVoiceDuration,
                    messageTotal: doc.messageActive?.total || 0
                };
            });

            // 1. SES SIRALAMASI: En aktife göre sıralayıp sunucuda olan ilk 8 üyeyi çekelim
            const voiceSorted = [...mappedUsers].sort((a, b) => b.voiceTotal - a.voiceTotal);
            const voiceRank: { name: string; avatarUrl: string; value: number }[] = [];
            
            for (const u of voiceSorted) {
                if (voiceRank.length >= 8) break;
                const member = await message.guild!.members.fetch(u.userID).catch(() => null);
                if (!member) continue;
                if (u.voiceTotal <= 0) continue; // Aktifliği olmayanları listeye alma
                
                voiceRank.push({
                    name: member.displayName || member.user.username,
                    avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 64 }),
                    value: u.voiceTotal
                });
            }

            // 2. MESAJ SIRALAMASI: En aktife göre sıralayıp sunucuda olan ilk 8 üyeyi çekelim
            const messageSorted = [...mappedUsers].sort((a, b) => b.messageTotal - a.messageTotal);
            const messageRank: { name: string; avatarUrl: string; value: number }[] = [];
            
            for (const u of messageSorted) {
                if (messageRank.length >= 8) break;
                const member = await message.guild!.members.fetch(u.userID).catch(() => null);
                if (!member) continue;
                if (u.messageTotal <= 0) continue; // Aktifliği olmayanları listeye alma
                
                messageRank.push({
                    name: member.displayName || member.user.username,
                    avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 64 }),
                    value: u.messageTotal
                });
            }

            // CanvasHelper üzerinden Top Liderlik kartını çiz
            const topBuffer = await CanvasHelper.drawTopCard({
                voiceRank,
                messageRank
            });

            const attachment = new AttachmentBuilder(topBuffer, { name: "loki_top_stats.png" });
            
            // Ön yükleme mesajını sil ve sıralama görselini gönder
            await waitMsg.delete().catch(() => {});
            await message.reply({ files: [attachment] });

        } catch (err) {
            console.error("[Top Command] Sıralama tablosu oluşturma hatası:", err);
            await waitMsg.edit("❌ Sunucu genel liderlik sıralaması hazırlanırken beklenmedik bir hata oluştu!").catch(() => {});
        }
    }
};
