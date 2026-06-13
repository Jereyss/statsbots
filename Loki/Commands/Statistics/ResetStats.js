const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
    name: "resetstats",
    aliases: ["statssifirla", "statsifir", "istatistiksifir"],
    description: "Kullanici veya tum sunucu istatistiklerini sifirlar.",
    usage: "resetstats [@kullanici / hepsi]",
    execute: async (client, message, args) => {
        const isDeveloper = client.config.Developers.includes(message.author.id);
        const hasAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);

        if (!isDeveloper && !hasAdmin) {
            return message.reply("❌ Bu komutu kullanmak icin yeterli yetkiniz bulunmuyor (Yonetici olmalisiniz).");
        }

        const guildId = message.guild.id;

        if (!args[0]) {
            return message.reply("❌ Lutfen sifirlanacak hedefi belirtin!\nOrnek kullanim:\n`!resetstats @kullanici` (Belirli biri)\n`!resetstats hepsi` (Tum sunucu)");
        }

        if (args[0].toLowerCase() === "hepsi" || args[0].toLowerCase() === "all") {
            const confirmMsg = await message.reply("⚠️ **TUM SUNUCU** istatistiklerini sifirlamak istediginize emin misiniz? Bu islem geri alinamaz! Onaylamak icin **30 saniye** icinde `evet` yazin.");

            const filter = (m) => m.author.id === message.author.id && m.content.toLowerCase() === "evet";
            try {
                const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ["time"] });

                if (collected.first()) {
                    await client.db.deleteMany({ guildID: guildId });
                    client.voiceSessions.clear();
                    await message.reply("✅ Sunucudaki tum kullanicilarin istatistikleri basariyla sifirlandı!");
                    await logToChannel(client, message, "Tum Sunucu Istatistik Sifirlama", `**Sifırlayan Yetkili:** ${message.author.tag} (${message.author.id})\n**Islem:** Tum veritabani kayitlari temizlendi.`);
                }
            } catch (err) {
                await confirmMsg.edit("❌ Onay suresi doldu veya iptal edildi. Sifirlama islemi iptal edildi.");
            }
            return;
        }

        let targetMember = message.mentions.members?.first();
        if (!targetMember && args[0]) {
            targetMember = await message.guild?.members.fetch(args[0]).catch(() => undefined);
        }

        if (!targetMember) {
            return message.reply("❌ Belirttiginiz kullanici bulunamadi!");
        }

        const targetId = targetMember.id;
        await client.db.deleteOne({ guildID: guildId, userID: targetId });

        if (client.voiceSessions.has(targetId)) {
            client.voiceSessions.set(targetId, {
                channelId: client.voiceSessions.get(targetId).channelId,
                joinedAt: Date.now()
            });
        }

        await message.reply(`✅ **${targetMember.displayName}** kullanicisinin tum istatistik verileri basariyla sifirlandı!`);
        await logToChannel(client, message, "Kullanici Istatistik Sifirlama", `**Sifırlayan Yetkili:** ${message.author.tag} (${message.author.id})\n**Sifırlanan Kullanici:** ${targetMember.user.tag} (${targetMember.id})`);
    }
};

async function logToChannel(client, message, title, description) {
    const guildConfig = await client.getSettings(message.guild.id);
    const logChanId = guildConfig.logChannelID;
    if (!logChanId) return;

    const logChannel = message.guild?.channels.cache.get(logChanId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setTitle(`🛠️ ${title}`)
        .setDescription(description)
        .setColor("#ed4245")
        .setTimestamp()
        .setFooter({ text: "Loki Istatistik Guvenligi", iconURL: client.user.displayAvatarURL() });

    logChannel.send({ embeds: [embed] }).catch(() => {});
}
