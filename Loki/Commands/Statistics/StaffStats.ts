import { Message, AttachmentBuilder } from "discord.js";
import { CanvasHelper } from "../../../Global/Utils/CanvasHelper";

export default {
    name: "yetkiliaktif",
    aliases: ["staffstats", "yetkilidenetim", "yetkililer", "staffs"],
    description: "Setup ile belirlenen yetkili rollerindeki kisilerin haftalik ses ve mesaj aktifliklerini denetleyen premium kart.",
    usage: "yetkiliaktif",
    execute: async (client: any, message: Message, args: string[]) => {
        const guildId = message.guild!.id;

        // On yukleme mesaji gonder
        const waitMsg = await message.reply(`${client.emoji("loading") || "⏳"} **Yetkili aktiflik denetim dashboard'u hazirlaniyor, lutfen bekleyin...**`);

        try {
            // Sunucu konfigurasyonunu cek
            const guildConfig = await client.getSettings(guildId);
            const staffRoles = guildConfig.staffRoles || [];

            if (staffRoles.length === 0) {
                await waitMsg.delete().catch(() => {});
                return message.reply(`❌ Sunucuda henuz hic yetkili rolu ayarlanmamis! Ayarlamak icin:\n\`${client.config.Prefix}setup yetkilirol ekle [@rol]\``);
            }

            // Performans Dostu Yetkili Üye Filtrelemesi (Büyük sunucularda API lag yapmaz!)
            const staffMembers = new Map<string, any>();
            for (const roleId of staffRoles) {
                const role = message.guild!.roles.cache.get(roleId);
                if (role) {
                    role.members.forEach((m) => {
                        if (!m.user.bot) staffMembers.set(m.id, m);
                    });
                }
            }

            const staffArray = Array.from(staffMembers.values());
            if (staffArray.length === 0) {
                await waitMsg.delete().catch(() => {});
                return message.reply("❌ Ayarlanan yetkili rollerinde sunucuda hic uye bulunmuyor!");
            }

            // Tek seferde veritabanindan tum yetkililerin verisini çekelim ($in Performans Optimizasyonu)
            const staffUserIDs = staffArray.map((m) => m.id);
            const statsDocs = await client.db.find({ guildID: guildId, userID: { $in: staffUserIDs } });
            const statsMap = new Map<string, any>();
            statsDocs.forEach((doc: any) => statsMap.set(doc.userID, doc));

            // Yetkilileri haritalayalim
            const staffRank = staffArray.map((m) => {
                const doc = statsMap.get(m.id);
                const voiceSeconds = doc?.voiceActive?.weekly || 0;
                const messages = doc?.messageActive?.weekly || 0;
                // Haftalık Hedef: En az 2 saat (7200 saniye) seste kalmis olmak
                const targetComplete = voiceSeconds >= 7200;

                return {
                    name: m.displayName || m.user.username,
                    avatarUrl: m.user.displayAvatarURL({ extension: "png", size: 64 }),
                    voiceSeconds,
                    messages,
                    targetComplete
                };
            });

            // Sese göre en aktiften en pasife sirala
            staffRank.sort((a, b) => b.voiceSeconds - a.voiceSeconds);

            // Canvas'i ciz
            const staffStatsBuffer = await CanvasHelper.drawStaffStatsCard({
                serverName: message.guild!.name,
                staffCount: staffArray.length,
                staffRank
            });

            const attachment = new AttachmentBuilder(staffStatsBuffer, { name: "loki_staff_active_dashboard.png" });

            await waitMsg.delete().catch(() => {});
            await message.reply({ files: [attachment] });

        } catch (err) {
            console.error("[StaffStats Command] Yetkili aktiflik karti olusturma hatasi:", err);
            await waitMsg.edit("❌ Yetkili aktiflik denetim raporu hazirlanirken beklenmedik bir hata olustu!").catch(() => {});
        }
    }
};
