import { Message, PermissionFlagsBits } from "discord.js";

// Mesaj istatistik spamini önlemek için bellek içi cooldown haritası (2 saniye limit)
const messageCooldowns = new Map<string, number>();

export default {
    name: "messageCreate",
    execute: async (client: any, message: Message) => {
        // Botları ve DM mesajlarını es geçelim
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        const channelId = message.channel.id;

        const guildConfig = await client.getSettings(guildId);

        // --- Filtreleme Kontrolleri (İstatistiklerden Muaf Tutma) ---
        const isUserFiltered = guildConfig.filteredUsers?.includes(userId) || false;
        const isChannelFiltered = guildConfig.filteredChannels?.includes(channelId) || false;
        const isRoleFiltered = message.member?.roles.cache.some((role: any) => guildConfig.filteredRoles?.includes(role.id)) || false;
        const isFiltered = isUserFiltered || isChannelFiltered || isRoleFiltered;

        // --- 1. Mesaj İstatistik Takip Sistemi (Anti-Spam Korumalı) ---
        const now = Date.now();
        const lastMessageTime = messageCooldowns.get(userId) || 0;

        if (!isFiltered && now - lastMessageTime > 2000) { // 2 saniye cooldown ve filtre denetimi
            messageCooldowns.set(userId, now);

            try {
                // client.db (UserStats modeli) üzerinden veritabanı güncellemesi yapıyoruz
                await client.db.findOneAndUpdate(
                    { guildID: guildId, userID: userId },
                    {
                        $inc: {
                            "messageActive.daily": 1,
                            "messageActive.weekly": 1,
                            "messageActive.monthly": 1,
                            "messageActive.total": 1,
                            [`messageChannels.${channelId}`]: 1
                        }
                    },
                    { upsert: true, new: true }
                );
            } catch (err) {
                console.error("[Veritabanı Hata] Mesaj istatistiği kaydedilemedi:", err);
            }
        }

        // --- 2. Prefix Komut Sistemi Kontrolü ---
        const prefix = client.config.Prefix;
        if (!message.content.startsWith(prefix)) return;

        // Argümanları ve komut adını ayır
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        // Dinamik Kanal İzni Denetimi
        
        const isAllowedChannel = guildConfig.allowedChannels.length === 0 || 
                                 guildConfig.allowedChannels.includes(channelId);
        
        const isDeveloper = client.config.Developers.includes(userId);
        const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);

        // Eğer kanal izinli değilse ve kullanan kişi geliştirici/yönetici değilse komutu çalıştırma
        if (!isAllowedChannel && !isDeveloper && !isAdmin) {
            try {
                const warnMsg = await message.reply("❌ Bu kanalda bot komutlarını kullanamazsınız! Sadece izin verilen komut kanallarında kullanabilirsiniz.");
                setTimeout(() => warnMsg.delete().catch(() => {}), 5000); // 5 saniye sonra uyarıyı sil
            } catch (e) {}
            return;
        }

        // Komutu bul (kendi adıyla veya alternatif isimleriyle/aliases)
        const command = client.commands.get(commandName) || 
                        client.commands.find((cmd: any) => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) return;

        try {
            // Komutu çalıştır
            await command.execute(client, message, args);
        } catch (error) {
            console.error(`[Komut Hata] Komut yürütülürken hata oluştu (${commandName}):`, error);
            message.reply({ content: "❌ Bu komut çalıştırılırken teknik bir hata oluştu!" }).catch(() => {});
        }
    }
};
