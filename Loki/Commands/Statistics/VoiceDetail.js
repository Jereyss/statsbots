const { AttachmentBuilder } = require("discord.js");
const { CanvasHelper } = require("../../../Global/Utils/CanvasHelper");

module.exports = {
    name: "sesdetay",
    aliases: ["voicedetail", "kategoridetay", "seskategorileri"],
    description: "5 farkli kategorideki ses suresi dagilimlarini gosterir.",
    usage: "sesdetay [@kullanici]",
    execute: async (client, message, args) => {
        let targetMember = message.mentions.members?.first();
        if (!targetMember && args[0]) {
            targetMember = await message.guild?.members.fetch(args[0]).catch(() => undefined);
        }
        if (!targetMember) targetMember = message.member;

        const targetUser = targetMember.user;
        const guildId = message.guild.id;
        const waitMsg = await message.reply(`${client.emoji("loading") || "⏳"} **Ses kategori analiz kartiniz hazirlaniyor...**`);

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

            const guildConfig = await client.getSettings(guildId);
            const orderedKeys = ["public", "game", "stream", "staff", "register"];
            const categoriesData = [];

            for (const key of orderedKeys) {
                const conf = guildConfig.voiceCategories.get(key) || { name: key.toUpperCase(), multiplier: 1 };
                const seconds = statDoc.voiceCategories ? (statDoc.voiceCategories.get(key) || 0) : 0;
                categoriesData.push({ name: conf.name, key, multiplier: conf.multiplier, seconds });
            }

            const status = targetMember.presence ? targetMember.presence.status : "offline";

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
            await waitMsg.edit("❌ Ses detay kartiniz hazirlanirken hata olustu!").catch(() => {});
        }
    }
};
