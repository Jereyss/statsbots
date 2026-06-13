const Discord = require("discord.js");
const { PermissionFlagsBits, AttachmentBuilder } = require("discord.js");
const { CanvasHelper } = require("../../../Global/Utils/CanvasHelper");

module.exports = {
    name: "filter",
    aliases: ["filtre", "muaf", "muafiyet"],
    description: "Istatistiklerden filtrelemek istediginiz kullanici, kanal ve rolleri yonetir.",
    usage: "filter [ekle / sil] [@kullanici / #kanal / @rol]",
    execute: async (client, message, args) => {
        const guild = message.guild;
        const guildId = guild.id;
        const userId = message.author.id;

        const isDeveloper = client.config.Developers.includes(userId);
        const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
        if (!isDeveloper && !isAdmin) {
            return message.reply("❌ Bu komutu kullanabilmek icin **Yonetici** yetkisine sahip olmalisiniz!");
        }

        const guildConfig = await client.getSettings(guildId);
        if (!guildConfig.filteredUsers) guildConfig.filteredUsers = [];
        if (!guildConfig.filteredChannels) guildConfig.filteredChannels = [];
        if (!guildConfig.filteredRoles) guildConfig.filteredRoles = [];

        const action = args[0]?.toLowerCase();

        if (action === "ekle" || action === "sil") {
            const targetMember = message.mentions.members?.first();
            const targetChannel = message.mentions.channels?.first();
            const targetRole = message.mentions.roles?.first();

            let targetId = "";
            let type = null;
            let displayName = "";

            if (targetMember) {
                targetId = targetMember.id; type = "user"; displayName = targetMember.user.tag;
            } else if (targetChannel) {
                targetId = targetChannel.id; type = "channel"; displayName = `#${targetChannel.name || targetChannel.id}`;
            } else if (targetRole) {
                targetId = targetRole.id; type = "role"; displayName = `@${targetRole.name}`;
            } else if (args[1]) {
                const possibleId = args[1];
                if (guild.members.cache.has(possibleId)) {
                    targetId = possibleId; type = "user";
                    displayName = guild.members.cache.get(possibleId).user.tag;
                } else if (guild.channels.cache.has(possibleId)) {
                    targetId = possibleId; type = "channel";
                    displayName = `#${guild.channels.cache.get(possibleId).name || possibleId}`;
                } else if (guild.roles.cache.has(possibleId)) {
                    targetId = possibleId; type = "role";
                    displayName = `@${guild.roles.cache.get(possibleId).name}`;
                }
            }

            if (!type || !targetId) {
                return message.reply(`❌ Lutfen gecerli bir uye, kanal veya rol belirtin!\nOrnek: \`${client.config.Prefix}filter ekle @uye\``);
            }

            if (action === "ekle") {
                if (type === "user") {
                    if (guildConfig.filteredUsers.includes(targetId)) return message.reply(`⚠️ **${displayName}** zaten filtre listesinde.`);
                    guildConfig.filteredUsers.push(targetId);
                } else if (type === "channel") {
                    if (guildConfig.filteredChannels.includes(targetId)) return message.reply(`⚠️ **${displayName}** zaten filtre listesinde.`);
                    guildConfig.filteredChannels.push(targetId);
                } else if (type === "role") {
                    if (guildConfig.filteredRoles.includes(targetId)) return message.reply(`⚠️ **${displayName}** zaten filtre listesinde.`);
                    guildConfig.filteredRoles.push(targetId);
                }
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);
                return message.reply(`✅ **${displayName}** basariyla istatistik filtre listesine **eklendi**.`);
            } else {
                if (type === "user") {
                    if (!guildConfig.filteredUsers.includes(targetId)) return message.reply(`⚠️ **${displayName}** filtre listesinde bulunmuyor.`);
                    guildConfig.filteredUsers = guildConfig.filteredUsers.filter((id) => id !== targetId);
                } else if (type === "channel") {
                    if (!guildConfig.filteredChannels.includes(targetId)) return message.reply(`⚠️ **${displayName}** filtre listesinde bulunmuyor.`);
                    guildConfig.filteredChannels = guildConfig.filteredChannels.filter((id) => id !== targetId);
                } else if (type === "role") {
                    if (!guildConfig.filteredRoles.includes(targetId)) return message.reply(`⚠️ **${displayName}** filtre listesinde bulunmuyor.`);
                    guildConfig.filteredRoles = guildConfig.filteredRoles.filter((id) => id !== targetId);
                }
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);
                return message.reply(`✅ **${displayName}** filtre listesinden basariyla **kaldirildi**.`);
            }
        }

        const waitMsg = await message.reply("⏳ **Filtre kontrol paneli hazirlaniyor...**");

        try {
            const usersList = [];
            for (const id of guildConfig.filteredUsers) {
                const user = await client.users.fetch(id).catch(() => undefined);
                if (user) {
                    usersList.push({ name: user.username, avatarUrl: user.displayAvatarURL({ extension: "png", size: 64 }) });
                } else {
                    usersList.push({ name: `Bilinmeyen Uye (${id})`, avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png" });
                }
            }

            const channelsList = [];
            for (const id of guildConfig.filteredChannels) {
                const chan = guild.channels.cache.get(id);
                channelsList.push(chan ? chan.name : `kanal-${id}`);
            }

            const rolesList = [];
            for (const id of guildConfig.filteredRoles) {
                const role = guild.roles.cache.get(id);
                rolesList.push({ name: role ? role.name : `rol-${id}`, color: role ? role.hexColor : "#9b59b6" });
            }

            const filterBuffer = await CanvasHelper.drawFilterCard({ users: usersList, channels: channelsList, roles: rolesList });

            const embedHeader = `**Istatistik Filtre Yonetim Paneli**\n\n*Filtre eklemek icin:* \`${client.config.Prefix}filter ekle [@kullanici / #kanal / @rol]\`\n*Filtre silmek icin:* \`${client.config.Prefix}filter sil [@kullanici / #kanal / @rol]\``;

            const refreshButton = new Discord.ButtonBuilder().setCustomId("filter_refresh").setLabel("Panel Yenile").setStyle(Discord.ButtonStyle.Secondary);
            const addButton = new Discord.ButtonBuilder().setCustomId("filter_add").setLabel("Filtre Ekle").setStyle(Discord.ButtonStyle.Secondary);
            const removeButton = new Discord.ButtonBuilder().setCustomId("filter_remove").setLabel("Filtre Kaldir").setStyle(Discord.ButtonStyle.Secondary);
            const row = new Discord.ActionRowBuilder().addComponents(refreshButton, addButton, removeButton);

            const gallery = new Discord.MediaGalleryBuilder().addItems(
                new Discord.MediaGalleryItemBuilder().setURL("attachment://loki_filters_panel.png")
            );
            const container = new Discord.ContainerBuilder()
                .addMediaGalleryComponents(gallery)
                .addSeparatorComponents(new Discord.SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new Discord.TextDisplayBuilder().setContent(embedHeader))
                .addSeparatorComponents(new Discord.SeparatorBuilder().setDivider(true))
                .addActionRowComponents(row);

            const attachment = new AttachmentBuilder(filterBuffer, { name: "loki_filters_panel.png" });
            await waitMsg.delete().catch(() => {});
            await message.reply({ components: [container], files: [attachment], flags: Discord.MessageFlags.IsComponentsV2 });
        } catch (err) {
            console.error("[Filter Command] Filtre karti olusturulurken hata:", err);
            await waitMsg.edit("❌ Filtre paneli yuklenirken teknik bir hata olustu!").catch(() => {});
        }
    }
};
