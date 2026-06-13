const { PermissionFlagsBits } = require("discord.js");

const messageCooldowns = new Map();

module.exports = {
    name: "messageCreate",
    execute: async (client, message) => {
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        const channelId = message.channel.id;

        const guildConfig = await client.getSettings(guildId);

        const isUserFiltered = guildConfig.filteredUsers?.includes(userId) || false;
        const isChannelFiltered = guildConfig.filteredChannels?.includes(channelId) || false;
        const isRoleFiltered = message.member?.roles.cache.some((role) => guildConfig.filteredRoles?.includes(role.id)) || false;
        const isFiltered = isUserFiltered || isChannelFiltered || isRoleFiltered;

        const now = Date.now();
        const lastMessageTime = messageCooldowns.get(userId) || 0;

        if (!isFiltered && now - lastMessageTime > 2000) {
            messageCooldowns.set(userId, now);
            try {
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
                console.error("[Veritabani Hata] Mesaj istatistigi kaydedilemedi:", err);
            }
        }

        const prefix = client.config.Prefix;
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName) return;

        const isAllowedChannel =
            guildConfig.allowedChannels.length === 0 ||
            guildConfig.allowedChannels.includes(channelId);

        const isDeveloper = client.config.Developers.includes(userId);
        const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);

        if (!isAllowedChannel && !isDeveloper && !isAdmin) {
            try {
                const warnMsg = await message.reply("❌ Bu kanalda bot komutlarini kullanamazsiniz!");
                setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
            } catch (e) {}
            return;
        }

        const command =
            client.commands.get(commandName) ||
            client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) return;

        try {
            await command.execute(client, message, args);
        } catch (error) {
            console.error(`[Komut Hata] (${commandName}):`, error);
            message.reply({ content: "❌ Bu komut calistirilirken teknik bir hata olustu!" }).catch(() => {});
        }
    }
};
