const { AttachmentBuilder } = require("discord.js");
const { CanvasHelper } = require("../../../Global/Utils/CanvasHelper");

module.exports = {
    name: "topdavet",
    aliases: ["topinvite", "topinvites", "davetsiralamasi"],
    description: "Sunucu genelindeki en aktif 8 davetcinin liderlik tablosunu gosterir.",
    usage: "topdavet",
    execute: async (client, message, args) => {
        const guildId = message.guild.id;
        const waitMsg = await message.reply(`${client.emoji("loading") || "⏳"} **Sunucu davet lider tablosu hazirlaniyor...**`);

        try {
            const allDocs = await client.db.find({ guildID: guildId });

            const mappedUsers = allDocs.map((doc) => {
                const regular = doc.inviteStats?.regular || 0;
                const left = doc.inviteStats?.left || 0;
                const bonus = doc.inviteStats?.bonus || 0;
                const fake = doc.inviteStats?.fake || 0;
                const total = regular + bonus - left;
                return { userID: doc.userID, regular, left, bonus, fake, total };
            });

            const sortedUsers = mappedUsers.sort((a, b) => b.total - a.total);
            const inviteRank = [];

            for (const u of sortedUsers) {
                if (inviteRank.length >= 8) break;
                const member = await message.guild.members.fetch(u.userID).catch(() => null);
                if (!member) continue;
                if (u.total <= 0) continue;
                inviteRank.push({
                    name: member.displayName || member.user.username,
                    avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 64 }),
                    regular: u.regular, left: u.left, bonus: u.bonus, fake: u.fake, total: u.total
                });
            }

            const topInviteBuffer = await CanvasHelper.drawTopInviteCard({ inviteRank });
            const attachment = new AttachmentBuilder(topInviteBuffer, { name: "loki_top_invite_stats.png" });

            await waitMsg.delete().catch(() => {});
            await message.reply({ files: [attachment] });
        } catch (err) {
            console.error("[TopInvite Command] Davet siralamasi olusturma hatasi:", err);
            await waitMsg.edit("❌ Sunucu davet liderlik siralamasi hazirlanirken hata olustu!").catch(() => {});
        }
    }
};
