const { AttachmentBuilder } = require("discord.js");
const { CanvasHelper } = require("../../../Global/Utils/CanvasHelper");

module.exports = {
    name: "invites",
    aliases: ["invite", "davet", "davetlerim", "davetsayisi"],
    description: "Davet istatistiklerinizi premium cam kaplamali kart uzerinde gosterir.",
    usage: "invites [@kullanici]",
    execute: async (client, message, args) => {
        let targetMember = message.mentions.members?.first();
        if (!targetMember && args[0]) {
            targetMember = await message.guild?.members.fetch(args[0]).catch(() => undefined);
        }
        if (!targetMember) targetMember = message.member;

        const targetUser = targetMember.user;
        const guildId = message.guild.id;
        const waitMsg = await message.reply(`${client.emoji("loading") || "⏳"} **Davet istatistik kartiniz hazirlaniyor...**`);

        try {
            let statDoc = await client.db.findOne({ guildID: guildId, userID: targetUser.id });
            if (!statDoc) {
                statDoc = new client.db({
                    guildID: guildId, userID: targetUser.id,
                    voiceActive: { daily: 0, weekly: 0, monthly: 0, total: 0 },
                    messageActive: { daily: 0, weekly: 0, monthly: 0, total: 0 },
                    voiceChannels: new Map(), voiceCategories: new Map(),
                    messageChannels: new Map(), hourlyVoice: Array(24).fill(0), dailyHistory: []
                });
            }

            const inviteStats = {
                regular: statDoc.inviteStats?.regular || 0,
                fake: statDoc.inviteStats?.fake || 0,
                left: statDoc.inviteStats?.left || 0,
                bonus: statDoc.inviteStats?.bonus || 0,
                total: 0
            };
            inviteStats.total = inviteStats.regular + inviteStats.bonus - inviteStats.left;

            const status = targetMember.presence ? targetMember.presence.status : "offline";

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
            console.error("[Invites Command] Davet karti olusturma hatasi:", err);
            await waitMsg.edit("❌ Davet kartiniz hazirlanirken hata olustu!").catch(() => {});
        }
    }
};
