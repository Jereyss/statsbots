import { Message, PermissionFlagsBits, EmbedBuilder, TextChannel } from "discord.js";

export default {
    name: "resetstats",
    aliases: ["statssifirla", "statsifir", "istatistiksifir"],
    description: "Kullanıcı veya tüm sunucu istatistiklerini sıfırlar.",
    usage: "resetstats [@kullanici / hepsi]",
    execute: async (client: any, message: Message, args: string[]) => {
        // Yetki Kontrolü: Komutu kullanan kişi Geliştirici listesinde mi veya Yönetici yetkisine sahip mi? (client.config üzerinden)
        const isDeveloper = client.config.Developers.includes(message.author.id);
        const hasAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);

        if (!isDeveloper && !hasAdmin) {
            return message.reply("❌ Bu komutu kullanmak için yeterli yetkiniz bulunmuyor (Yönetici olmanız gerekir).");
        }

        const guildId = message.guild!.id;

        if (!args[0]) {
            return message.reply("❌ Lütfen sıfırlanacak hedefi belirtin!\nÖrnek kullanım:\n`!resetstats @kullanici` (Belirli biri)\n`!resetstats hepsi` (Tüm sunucu)");
        }

        // --- SEÇENEK 1: TÜM SUNUCUYU SIFIRLA ---
        if (args[0].toLowerCase() === "hepsi" || args[0].toLowerCase() === "all") {
            const confirmMsg = await message.reply("⚠️ **TÜM SUNUCU** istatistiklerini sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz! Onaylamak için **30 saniye** içinde `evet` yazın.");
            
            const filter = (m: Message) => m.author.id === message.author.id && m.content.toLowerCase() === "evet";
            try {
                const collected = await (message.channel as any).awaitMessages({ filter, max: 1, time: 30000, errors: ["time"] });
                
                if (collected.first()) {
                    // client.db (UserStats modeli) üzerinden tüm kayıtları temizliyoruz
                    await client.db.deleteMany({ guildID: guildId });
                    
                    // Aktif ses oturumlarını da temizleyelim
                    client.voiceSessions.clear();

                    await message.reply("✅ Sunucudaki tüm kullanıcıların istatistikleri başarıyla sıfırlandı!");

                    // Log Gönder
                    await logToChannel(client, message, "Tüm Sunucu İstatistik Sıfırlama", `**Sıfırlayan Yetkili:** ${message.author.tag} (${message.author.id})\n**İşlem:** Tüm veritabanı kayıtları temizlendi.`);
                }
            } catch (err) {
                await confirmMsg.edit("❌ Onay süresi doldu veya iptal edildi. İstatistik sıfırlama işlemi iptal edildi.");
            }
            return;
        }

        // --- SEÇENEK 2: BELİRLİ BİR KULLANICIYI SIFIRLA ---
        let targetMember = message.mentions.members?.first();
        if (!targetMember && args[0]) {
            targetMember = await message.guild?.members.fetch(args[0]).catch(() => undefined);
        }

        if (!targetMember) {
            return message.reply("❌ Belirttiğiniz kullanıcı bulunamadı! Geçerli bir kullanıcı etiketleyin veya ID girin.");
        }

        const targetId = targetMember.id;

        // client.db üzerinden belirli kullanıcının verisini siliyoruz
        await client.db.deleteOne({ guildID: guildId, userID: targetId });
        
        // Eğer kullanıcı şu an seste ise aktif ses oturumunu da yenileyelim
        if (client.voiceSessions.has(targetId)) {
            client.voiceSessions.set(targetId, {
                channelId: client.voiceSessions.get(targetId).channelId,
                joinedAt: Date.now()
            });
        }

        await message.reply(`✅ **${targetMember.displayName}** kullanıcısının tüm istatistik verileri başarıyla sıfırlandı!`);

        // Log Gönder
        await logToChannel(client, message, "Kullanıcı İstatistik Sıfırlama", `**Sıfırlayan Yetkili:** ${message.author.tag} (${message.author.id})\n**Sıfırlanan Kullanıcı:** ${targetMember.user.tag} (${targetMember.id})`);
    }
};

/**
 * Sıfırlama işlemlerini belirlenen log kanalına gönderir (Dinamik GuildConfig üzerinden).
 */
async function logToChannel(client: any, message: Message, title: string, description: string) {
    const guildConfig = await client.getSettings(message.guild!.id);
    const logChanId = guildConfig.logChannelID;
    
    if (!logChanId) return;

    const logChannel = message.guild?.channels.cache.get(logChanId) as TextChannel;
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setTitle(`🛠️ ${title}`)
        .setDescription(description)
        .setColor("#ed4245" as any)
        .setTimestamp()
        .setFooter({ text: "Loki İstatistik Güvenliği", iconURL: client.user.displayAvatarURL() });

    logChannel.send({ embeds: [embed] }).catch(() => {});
}
