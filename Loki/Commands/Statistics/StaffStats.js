const { AttachmentBuilder } = require("discord.js");
const { CanvasHelper } = require("../../../Global/Utils/CanvasHelper");

module.exports = {
    name: "yetkiliaktif",
    aliases: ["staffstats", "yetkilidenetim", "yetkililer", "staffs"],
    description: "Yetkili rollerindeki kisilerin haftalik ses ve mesaj aktifliklerini denetler.",
    usage: "yetkiliaktif",
    execute: async (client, message, args) => {
        const guildId = message.guild.id;
        const waitMsg = await message.reply(`${client.emoji("loading") || "⏳"} **Yetkili aktiflik denetim dashboard'u hazirlaniyor...**`);

        try {
            const guildConfig = await client.getSettings(guildId);
            const staffRoles = guildConfig.staffRoles || [];

            if (staffRoles.length === 0) {
                await waitMsg.delete().catch(() => {});
                return message.reply(`❌ Sunucuda henuz hic yetkili rolu ayarlanmamis!`);
            }

            const staffMembers = new Map();
            for (const roleId of staffRoles) {
                const role = message.guild.roles.cache.get(roleId);
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

            const staffUserIDs = staffArray.map((m) => m.id);
            const statsDocs = await client.db.find({ guildID: guildId, userID: { $in: staffUserIDs } });
            const statsMap = new Map();
            statsDocs.forEach((doc) => statsMap.set(doc.userID, doc));

            const staffRank = staffArray.map((m) => {
                const doc = statsMap.get(m.id);
                const voiceSeconds = doc?.voiceActive?.weekly || 0;
                const messages = doc?.messageActive?.weekly || 0;
                const targetComplete = voiceSeconds >= 7200;
                return {
                    name: m.displayName || m.user.username,
                    avatarUrl: m.user.displayAvatarURL({ extension: "png", size: 64 }),
                    voiceSeconds, messages, targetComplete
                };
            });

            staffRank.sort((a, b) => b.voiceSeconds - a.voiceSeconds);

            const staffStatsBuffer = await CanvasHelper.drawStaffStatsCard({
                serverName: message.guild.name,
                staffCount: staffArray.length,
                staffRank
            });

            const attachment = new AttachmentBuilder(staffStatsBuffer, { name: "loki_staff_active_dashboard.png" });
            await waitMsg.delete().catch(() => {});
            await message.reply({ files: [attachment] });
        } catch (err) {
            console.error("[StaffStats Command] Yetkili aktiflik karti olusturma hatasi:", err);
            await waitMsg.edit("❌ Yetkili aktiflik denetim raporu hazirlanirken hata olustu!").catch(() => {});
        }
    }
};
