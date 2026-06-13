import { Message, AttachmentBuilder } from "discord.js";
import { CanvasHelper } from "../../../Global/Utils/CanvasHelper";

export default {
    name: "topdavet",
    aliases: ["topinvite", "topinvites", "davetsiralamasi", "davetsiralaması"],
    description: "Sunucu genelindeki en aktif 8 davetcinin liderlik tablosunu Glassmorphic premium kart uzerinde gosterir.",
    usage: "topdavet",
    execute: async (client: any, message: Message, args: string[]) => {
        const guildId = message.guild!.id;

        // On yukleme mesaji gonder
        const waitMsg = await message.reply(`${client.emoji("loading") || "⏳"} **Sunucu davet lider tablosu hazirlaniyor, lutfen bekleyin...**`);

        try {
            // Sunucudaki tum kayitlari veritabanindan cek
            const allDocs = await client.db.find({ guildID: guildId });

            // Davet sayilarini hesaplayarak kullanicilari haritalayalim
            const mappedUsers = allDocs.map((doc: any) => {
                const regular = doc.inviteStats?.regular || 0;
                const left = doc.inviteStats?.left || 0;
                const bonus = doc.inviteStats?.bonus || 0;
                const fake = doc.inviteStats?.fake || 0;
                const total = regular + bonus - left;

                return {
                    userID: doc.userID,
                    regular,
                    left,
                    bonus,
                    fake,
                    total
                };
            });

            // Davet sayisina gore siralayip sunucuda olan ilk 8 uyeyi cekelim
            const sortedUsers = mappedUsers.sort((a: any, b: any) => b.total - a.total);
            const inviteRank: { name: string; avatarUrl: string; regular: number; left: number; bonus: number; fake: number; total: number }[] = [];

            for (const u of sortedUsers) {
                if (inviteRank.length >= 8) break;
                const member = await message.guild!.members.fetch(u.userID).catch(() => null);
                if (!member) continue;
                if (u.total <= 0) continue; // Daveti olmayanlari listeye alma
                
                inviteRank.push({
                    name: member.displayName || member.user.username,
                    avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 64 }),
                    regular: u.regular,
                    left: u.left,
                    bonus: u.bonus,
                    fake: u.fake,
                    total: u.total
                });
            }

            // Canvas'i ciz
            const topInviteBuffer = await CanvasHelper.drawTopInviteCard({
                inviteRank
            });

            const attachment = new AttachmentBuilder(topInviteBuffer, { name: "loki_top_invite_stats.png" });

            await waitMsg.delete().catch(() => {});
            await message.reply({ files: [attachment] });

        } catch (err) {
            console.error("[TopInvite Command] Davet siralamasi olusturma hatasi:", err);
            await waitMsg.edit("❌ Sunucu davet liderlik siralamasi hazirlanirken beklenmedik bir hata olustu!").catch(() => {});
        }
    }
};
