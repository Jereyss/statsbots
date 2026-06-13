import { Message, AttachmentBuilder } from "discord.js";
import { CanvasHelper } from "../../../Global/Utils/CanvasHelper";

export default {
    name: "sesdetay",
    aliases: ["voicedetail", "kategoridetay", "seskategorileri"],
    description: "5 farkli kategorideki (Public, Oyun, Yayin, Yetkili, Kayit) ses suresi dagilimlarini Glassmorphic premium kartta gosterir.",
    usage: "sesdetay [@kullanici]",
    execute: async (client: any, message: Message, args: string[]) => {
        let targetMember = message.mentions.members?.first();
        if (!targetMember && args[0]) {
            targetMember = await message.guild?.members.fetch(args[0]).catch(() => undefined);
        }
        if (!targetMember) targetMember = message.member!;

        const targetUser = targetMember.user;
        const guildId = message.guild!.id;

        // On yukleme mesaji gonder
        const waitMsg = await message.reply(`${client.emoji("loading") || "⏳"} **Ses kategori analiz kartiniz hazirlaniyor, lutfen bekleyin...**`);

        try {
            // Veritabani kaydini cek
            let statDoc = await client.db.findOne({ guildID: guildId, userID: targetUser.id });
            if (!statDoc) {
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

            // Sunucu yapilandirmasini cek
            const guildConfig = await client.getSettings(guildId);

            // Kategorileri derleyelim
            const orderedKeys = ["public", "game", "stream", "staff", "register"];
            const categoriesData: any[] = [];

            for (const key of orderedKeys) {
                const conf = guildConfig.voiceCategories.get(key) || { name: key.toUpperCase(), multiplier: 1 };
                const seconds = statDoc.voiceCategories ? (statDoc.voiceCategories.get(key) || 0) : 0;
                
                categoriesData.push({
                    name: conf.name,
                    key: key,
                    multiplier: conf.multiplier,
                    seconds: seconds
                });
            }

            // Kullanici durum isigi tespiti
            const status = targetMember.presence ? targetMember.presence.status : "offline";

            // CanvasHelper uzerinden karti ciz
            const detailBuffer = await CanvasHelper.drawVoiceDetailCard({
                displayName: targetMember.displayName || targetUser.username,
                tag: targetUser.tag,
                avatarUrl: targetUser.displayAvatarURL({ extension: "png", size: 256 }),
                status,
                totalVoiceSeconds: statDoc.voiceActive?.total || 0,
                categories: categoriesData
            });

            const attachment = new AttachmentBuilder(detailBuffer, { name: "loki_voice_detail_stats.png" });

            await waitMsg.delete().catch(() => {});
            await message.reply({ files: [attachment] });

        } catch (err) {
            console.error("[VoiceDetail Command] Ses detay karti olusturma hatasi:", err);
            await waitMsg.edit("❌ Ses detay kartiniz hazirlanirken beklenmedik bir hata olustu!").catch(() => {});
        }
    }
};
