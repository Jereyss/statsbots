import * as Discord from "discord.js";
import { Message, PermissionFlagsBits, AttachmentBuilder } from "discord.js";
import { CanvasHelper } from "../../../Global/Utils/CanvasHelper";

export default {
    name: "filter",
    aliases: ["filtre", "muaf", "muafiyet"],
    description: "İstatistiklerden filtrelemek istediğiniz kullanıcı, kanal ve rolleri yönetir.",
    usage: "filter [ekle / sil] [@kullanici / #kanal / @rol]",
    execute: async (client: any, message: Message, args: string[]) => {
        const guild = message.guild!;
        const guildId = guild.id;
        const userId = message.author.id;

        // 1. Yetki Kontrolü (Sadece Yönetici ve Geliştiriciler)
        const isDeveloper = client.config.Developers.includes(userId);
        const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
        if (!isDeveloper && !isAdmin) {
            return message.reply("❌ Bu komutu kullanabilmek için **Yönetici** yetkisine sahip olmalısınız!");
        }

        const guildConfig = await client.getSettings(guildId);

        // Dizileri garantiye alalım
        if (!guildConfig.filteredUsers) guildConfig.filteredUsers = [];
        if (!guildConfig.filteredChannels) guildConfig.filteredChannels = [];
        if (!guildConfig.filteredRoles) guildConfig.filteredRoles = [];

        const action = args[0]?.toLowerCase();

        // --- DURUM A: FİLTRE EKLE / SİL İŞLEMLERİ ---
        if (action === "ekle" || action === "sil") {
            const targetMember = message.mentions.members?.first();
            const targetChannel = message.mentions.channels?.first();
            const targetRole = message.mentions.roles?.first();

            let targetId = "";
            let type: "user" | "channel" | "role" | null = null;
            let displayName = "";

            if (targetMember) {
                targetId = targetMember.id;
                type = "user";
                displayName = targetMember.user.tag;
            } else if (targetChannel) {
                targetId = targetChannel.id;
                type = "channel";
                displayName = `#${(targetChannel as any).name || targetChannel.id}`;
            } else if (targetRole) {
                targetId = targetRole.id;
                type = "role";
                displayName = `@${targetRole.name}`;
            } else if (args[1]) {
                // ID ile eklemeyi deneyelim
                const possibleId = args[1];
                if (guild.members.cache.has(possibleId)) {
                    targetId = possibleId;
                    type = "user";
                    displayName = guild.members.cache.get(possibleId)!.user.tag;
                } else if (guild.channels.cache.has(possibleId)) {
                    targetId = possibleId;
                    type = "channel";
                    displayName = `#${(guild.channels.cache.get(possibleId) as any).name || possibleId}`;
                } else if (guild.roles.cache.has(possibleId)) {
                    targetId = possibleId;
                    type = "role";
                    displayName = `@${guild.roles.cache.get(possibleId)!.name}`;
                }
            }

            if (!type || !targetId) {
                return message.reply(`❌ Lütfen geçerli bir üye (@mention), kanal (#mention) veya rol (@mention) belirtin!\nÖrnek: \`${client.config.Prefix}filter ekle @uye\``);
            }

            if (action === "ekle") {
                if (type === "user") {
                    if (guildConfig.filteredUsers.includes(targetId)) {
                        return message.reply(`⚠️ **${displayName}** zaten filtre listesinde bulunuyor.`);
                    }
                    guildConfig.filteredUsers.push(targetId);
                } else if (type === "channel") {
                    if (guildConfig.filteredChannels.includes(targetId)) {
                        return message.reply(`⚠️ **${displayName}** zaten filtre listesinde bulunuyor.`);
                    }
                    guildConfig.filteredChannels.push(targetId);
                } else if (type === "role") {
                    if (guildConfig.filteredRoles.includes(targetId)) {
                        return message.reply(`⚠️ **${displayName}** zaten filtre listesinde bulunuyor.`);
                    }
                    guildConfig.filteredRoles.push(targetId);
                }

                guildConfig.markModified("filteredUsers");
                guildConfig.markModified("filteredChannels");
                guildConfig.markModified("filteredRoles");
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);

                return message.reply(`✅ **${displayName}** başarıyla istatistik filtre listesine **eklendi** ve muaf tutuldu.`);
            } else {
                // SİL İŞLEMİ
                if (type === "user") {
                    if (!guildConfig.filteredUsers.includes(targetId)) {
                        return message.reply(`⚠️ **${displayName}** filtre listesinde bulunmuyor.`);
                    }
                    guildConfig.filteredUsers = guildConfig.filteredUsers.filter((id: string) => id !== targetId);
                } else if (type === "channel") {
                    if (!guildConfig.filteredChannels.includes(targetId)) {
                        return message.reply(`⚠️ **${displayName}** filtre listesinde bulunmuyor.`);
                    }
                    guildConfig.filteredChannels = guildConfig.filteredChannels.filter((id: string) => id !== targetId);
                } else if (type === "role") {
                    if (!guildConfig.filteredRoles.includes(targetId)) {
                        return message.reply(`⚠️ **${displayName}** filtre listesinde bulunmuyor.`);
                    }
                    guildConfig.filteredRoles = guildConfig.filteredRoles.filter((id: string) => id !== targetId);
                }

                guildConfig.markModified("filteredUsers");
                guildConfig.markModified("filteredChannels");
                guildConfig.markModified("filteredRoles");
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);

                return message.reply(`✅ **${displayName}** filtre listesinden başarıyla **kaldırıldı**.`);
            }
        }

        // --- DURUM B: GÖRSEL PANELLE LİSTELEME ---
        const waitMsg = await message.reply("⏳ **Filtre kontrol paneli hazırlanıyor, lütfen bekleyin...**");

        try {
            // Filtrelenen Kullanıcı Verilerini Çekelim
            const usersList = [];
            for (const id of guildConfig.filteredUsers) {
                const user = await client.users.fetch(id).catch(() => undefined);
                if (user) {
                    usersList.push({
                        name: user.username,
                        avatarUrl: user.displayAvatarURL({ extension: "png", size: 64 })
                    });
                } else {
                    usersList.push({
                        name: `Bilinmeyen Uye (${id})`,
                        avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png"
                    });
                }
            }

            // Filtrelenen Kanalları Çekelim
            const channelsList = [];
            for (const id of guildConfig.filteredChannels) {
                const chan = guild.channels.cache.get(id);
                channelsList.push(chan ? (chan as any).name : `kanal-${id}`);
            }

            // Filtrelenen Rolleri Çekelim
            const rolesList = [];
            for (const id of guildConfig.filteredRoles) {
                const role = guild.roles.cache.get(id);
                rolesList.push({
                    name: role ? role.name : `rol-${id}`,
                    color: role ? role.hexColor : "#9b59b6"
                });
            }

            // Kartı Çiz
            const filterBuffer = await CanvasHelper.drawFilterCard({
                users: usersList,
                channels: channelsList,
                roles: rolesList
            });

            const embedHeader = `**İstatistik Filtre Yönetim Paneli**\n\n*Filtre eklemek için:* \`${client.config.Prefix}filter ekle [@kullanici / #kanal / @rol]\`\n*Filtre silmek için:* \`${client.config.Prefix}filter sil [@kullanici / #kanal / @rol]\``;

            const refreshButton = new Discord.ButtonBuilder()
                .setCustomId("filter_refresh")
                .setLabel("Panel Yenile")
                .setStyle(Discord.ButtonStyle.Secondary);

            const addButton = new Discord.ButtonBuilder()
                .setCustomId("filter_add")
                .setLabel("Filtre Ekle")
                .setStyle(Discord.ButtonStyle.Secondary);

            const removeButton = new Discord.ButtonBuilder()
                .setCustomId("filter_remove")
                .setLabel("Filtre Kaldır")
                .setStyle(Discord.ButtonStyle.Secondary);

            const row = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
                .addComponents(refreshButton, addButton, removeButton);

            // Görseli yeni nesil MediaGallery bileşeni olarak Container'a gömüyoruz
            const gallery = new (Discord as any).MediaGalleryBuilder()
                .addItems(
                    new (Discord as any).MediaGalleryItemBuilder()
                        .setURL("attachment://loki_filters_panel.png")
                );

            const container = new (Discord as any).ContainerBuilder()
                .addMediaGalleryComponents(gallery)
                .addSeparatorComponents(new (Discord as any).SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new (Discord as any).TextDisplayBuilder().setContent(embedHeader))
                .addSeparatorComponents(new (Discord as any).SeparatorBuilder().setDivider(true))
                .addActionRowComponents(row);

            const attachment = new AttachmentBuilder(filterBuffer, { name: "loki_filters_panel.png" });

            await waitMsg.delete().catch(() => { });

            // Tek mesajda, legacy embed alanlarını kullanmadan en üstte görsel + altta panel olarak gönder
            await message.reply({
                components: [container],
                files: [attachment],
                flags: Discord.MessageFlags.IsComponentsV2
            });

        } catch (err) {
            console.error("[Filter Command] Filtre kartı oluşturulurken hata:", err);
            await waitMsg.edit("❌ Filtre paneli yüklenirken teknik bir hata oluştu!").catch(() => { });
        }
    }
};
