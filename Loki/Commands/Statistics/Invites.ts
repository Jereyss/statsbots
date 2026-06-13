import { Message, AttachmentBuilder } from "discord.js";
import { CanvasHelper } from "../../../Global/Utils/CanvasHelper";

export default {
    name: "invites",
    aliases: ["invite", "davet", "davetlerim", "davetsayisi"],
    description: "Davet istatistiklerinizi premium cam kaplamalı (Glassmorphic) kart üzerinde gösterir.",
    usage: "invites [@kullanici]",
    execute: async (client: any, message: Message, args: string[]) => {
        let targetMember = message.mentions.members?.first();
        if (!targetMember && args[0]) {
            targetMember = await message.guild?.members.fetch(args[0]).catch(() => undefined);
        }
        if (!targetMember) targetMember = message.member!;

        const targetUser = targetMember.user;
        const guildId = message.guild!.id;

        // Ön yükleme mesajı gönder
        const waitMsg = await message.reply(`${client.emoji("loading") || "⏳"} **Davet istatistik kartınız hazırlanıyor, lütfen bekleyin...**`);

        try {
            // Veritabanı kaydını çek
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

            // inviteStats alanını garantiye alalım
            const inviteStats = {
                regular: statDoc.inviteStats?.regular || 0,
                fake: statDoc.inviteStats?.fake || 0,
                left: statDoc.inviteStats?.left || 0,
                bonus: statDoc.inviteStats?.bonus || 0,
                total: 0
            };
            
            // Net toplam daveti hesapla: (Gerçek + Bonus - Ayrılan)
            inviteStats.total = inviteStats.regular + inviteStats.bonus - inviteStats.left;

            // Kullanıcı durum ışığı tespiti
            const status = targetMember.presence ? targetMember.presence.status : "offline";

            // CanvasHelper üzerinden davet kartını çiz
            const inviteBuffer = await CanvasHelper.drawInviteCard({
                displayName: targetMember.displayName || targetUser.username,
                tag: targetUser.tag,
                avatarUrl: targetUser.displayAvatarURL({ extension: "png", size: 256 }),
                status,
                inviteStats
            });

            const attachment = new AttachmentBuilder(inviteBuffer, { name: "loki_invite_stats.png" });

            await waitMsg.delete().catch(() => {});
            await message.reply({ files: [attachment] });

        } catch (err) {
            console.error("[Invites Command] Davet kartı oluşturma hatası:", err);
            await waitMsg.edit("❌ Davet kartınız hazırlanırken beklenmedik bir hata oluştu!").catch(() => {});
        }
    }
};
