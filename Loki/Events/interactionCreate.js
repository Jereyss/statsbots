const Discord = require("discord.js");
const {
    ModalBuilder, AttachmentBuilder,
    TextInputBuilder, TextInputStyle,
    ActionRowBuilder, ChannelSelectMenuBuilder,
    StringSelectMenuBuilder, ChannelType,
    ButtonBuilder, ButtonStyle, RoleSelectMenuBuilder
} = require("discord.js");

function getMainButtonsRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("btn_setup_genel").setLabel("Genel Sistem").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("btn_setup_twitch").setLabel("Twitch & Durum").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("btn_setup_kanallar").setLabel("Komut Kanallari").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("btn_setup_carpanlar").setLabel("Kategori Carpanlari").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("btn_setup_odalar").setLabel("Kategori Odalari").setStyle(ButtonStyle.Secondary)
    );
}

function getGenelSistemRows(guildConfig, interaction) {
    const selectVoice = new ChannelSelectMenuBuilder()
        .setCustomId("sel_setup_botvoice")
        .setPlaceholder("Botun Girecegi Ses Kanalini Secin...")
        .addChannelTypes(ChannelType.GuildVoice)
        .setMinValues(0).setMaxValues(1);

    if (guildConfig.botVoiceChannelID && interaction.guild.channels.cache.has(guildConfig.botVoiceChannelID)) {
        selectVoice.setDefaultChannels(guildConfig.botVoiceChannelID);
    }

    const selectLog = new ChannelSelectMenuBuilder()
        .setCustomId("sel_setup_logchannel")
        .setPlaceholder("Sifirlama Log Kanalini Secin...")
        .addChannelTypes(ChannelType.GuildText)
        .setMinValues(0).setMaxValues(1);

    if (guildConfig.logChannelID && interaction.guild.channels.cache.has(guildConfig.logChannelID)) {
        selectLog.setDefaultChannels(guildConfig.logChannelID);
    }

    const selectRoles = new RoleSelectMenuBuilder()
        .setCustomId("sel_setup_staffroles")
        .setPlaceholder("Yetkili Rollerini Secin (Coklu Secebilirsiniz)...")
        .setMinValues(0).setMaxValues(25);

    if (guildConfig.staffRoles && guildConfig.staffRoles.length > 0) {
        const validIds = guildConfig.staffRoles.filter((id) => interaction.guild.roles.cache.has(id));
        if (validIds.length > 0) selectRoles.setDefaultRoles(...validIds);
    }

    const rowVoice = new ActionRowBuilder().addComponents(selectVoice);
    const rowLog = new ActionRowBuilder().addComponents(selectLog);
    const rowRoles = new ActionRowBuilder().addComponents(selectRoles);
    const rowBack = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("btn_setup_back").setLabel("⬅️ Paneli Guncelle & Geri Don").setStyle(ButtonStyle.Secondary)
    );

    return [rowVoice, rowLog, rowRoles, rowBack];
}

async function updateDashboardMessage(client, guildConfig, interaction, components) {
    const allowedChannelsNames = guildConfig.allowedChannels.map((id) => {
        const ch = interaction.guild.channels.cache.get(id);
        return ch ? `#${ch.name}` : id;
    });

    const botVoiceChannelName = guildConfig.botVoiceChannelID
        ? (interaction.guild.channels.cache.get(guildConfig.botVoiceChannelID)?.name || guildConfig.botVoiceChannelID)
        : "Ayarlanmamis";

    const logChannelName = guildConfig.logChannelID
        ? (interaction.guild.channels.cache.get(guildConfig.logChannelID)?.name || guildConfig.logChannelID)
        : "Ayarlanmamis";

    const categoriesData = [];
    const orderedKeys = ["public", "game", "stream", "staff", "register"];
    for (const key of orderedKeys) {
        const cat = guildConfig.voiceCategories.get(key);
        if (cat) {
            const resolvedNames = [];
            for (const id of (cat.channels || [])) {
                const ch = interaction.guild.channels.cache.get(id);
                if (ch) {
                    if (ch.type === ChannelType.GuildCategory) {
                        const subChans = interaction.guild.channels.cache.filter((c) => c.parentId === ch.id && c.isVoiceBased());
                        subChans.forEach((vc) => resolvedNames.push(vc.name));
                    } else {
                        resolvedNames.push(ch.name);
                    }
                } else {
                    resolvedNames.push(id);
                }
            }
            categoriesData.push({
                name: cat.name, key, multiplier: cat.multiplier,
                channelsCount: cat.channels ? cat.channels.length : 0,
                channelsList: resolvedNames
            });
        }
    }

    const staffRolesNames = (guildConfig.staffRoles || []).map((id) => {
        const role = interaction.guild.roles.cache.get(id);
        return role ? `@${role.name}` : id;
    });

    const setupBuffer = await client.canvas.drawSetupCard({
        allowedChannels: allowedChannelsNames,
        botVoiceChannel: botVoiceChannelName,
        logChannel: logChannelName,
        twitchURL: guildConfig.twitchURL || "Ayarlanmamis",
        activityName: guildConfig.activityName || "Ayarlanmamis",
        staffRoles: staffRolesNames,
        voiceCategories: categoriesData
    });

    const attachment = new AttachmentBuilder(setupBuffer, { name: "loki_setup_dashboard.png" });

    if (interaction.message) {
        await interaction.message.edit({
            content: "",
            files: [attachment],
            components: components
        });
    }
}

module.exports = {
    name: "interactionCreate",
    execute: async (client, interaction) => {
        const guildId = interaction.guild?.id;
        if (!guildId) return;

        const isDeveloper = client.config.Developers.includes(interaction.user.id);

        // --- 1. BUTON ETKİLEŞİMLERİ ---
        if (interaction.isButton()) {
            if (interaction.customId.startsWith("help_")) {
                await interaction.deferUpdate();
                const cat = interaction.customId.replace("help_", "");

                const { CanvasHelper: CanvasRef } = require("../../Global/Utils/CanvasHelper");
                const helpBuffer = await CanvasRef.drawHelpCard({ category: cat });

                const embedHeader = `**Loki Istatistik ve Yonetim Sistemi Kilavuzu**\n\n*Asagidaki butonlari kullanarak sekmeler arasinda gecis yapabilirsiniz.*`;

                const homeButton = new ButtonBuilder().setCustomId("help_home").setLabel("Ana Sayfa").setStyle(ButtonStyle.Secondary);
                const rootButton = new ButtonBuilder().setCustomId("help_root").setLabel("Yonetim Komutlari").setStyle(ButtonStyle.Secondary);
                const statsButton = new ButtonBuilder().setCustomId("help_stats").setLabel("Istatistik Komutlari").setStyle(ButtonStyle.Secondary);
                const row = new ActionRowBuilder().addComponents(homeButton, rootButton, statsButton);

                const gallery = new Discord.MediaGalleryBuilder().addItems(
                    new Discord.MediaGalleryItemBuilder().setURL("attachment://loki_help_panel.png")
                );
                const container = new Discord.ContainerBuilder()
                    .addMediaGalleryComponents(gallery)
                    .addSeparatorComponents(new Discord.SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new Discord.TextDisplayBuilder().setContent(embedHeader))
                    .addSeparatorComponents(new Discord.SeparatorBuilder().setDivider(true))
                    .addActionRowComponents(row);

                const attachment = new AttachmentBuilder(helpBuffer, { name: "loki_help_panel.png" });
                await interaction.editReply({ components: [container], files: [attachment], flags: Discord.MessageFlags.IsComponentsV2 });
                return;
            }

            if (interaction.customId === "filter_refresh") {
                await interaction.deferUpdate();
                const guildConfig = await client.getSettings(guildId);
                if (!guildConfig.filteredUsers) guildConfig.filteredUsers = [];
                if (!guildConfig.filteredChannels) guildConfig.filteredChannels = [];
                if (!guildConfig.filteredRoles) guildConfig.filteredRoles = [];

                const usersList = [];
                for (const id of guildConfig.filteredUsers) {
                    const user = await client.users.fetch(id).catch(() => undefined);
                    if (user) usersList.push({ name: user.username, avatarUrl: user.displayAvatarURL({ extension: "png", size: 64 }) });
                    else usersList.push({ name: `Bilinmeyen Uye (${id})`, avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png" });
                }
                const channelsList = [];
                for (const id of guildConfig.filteredChannels) {
                    const chan = interaction.guild.channels.cache.get(id);
                    channelsList.push(chan ? chan.name : `kanal-${id}`);
                }
                const rolesList = [];
                for (const id of guildConfig.filteredRoles) {
                    const role = interaction.guild.roles.cache.get(id);
                    rolesList.push({ name: role ? role.name : `rol-${id}`, color: role ? role.hexColor : "#9b59b6" });
                }

                const { CanvasHelper: CanvasRef } = require("../../Global/Utils/CanvasHelper");
                const filterBuffer = await CanvasRef.drawFilterCard({ users: usersList, channels: channelsList, roles: rolesList });
                const embedHeader = `**Istatistik Filtre Yonetim Paneli**\n\n*Filtre eklemek icin:* \`${client.config.Prefix}filter ekle [@kullanici / #kanal / @rol]\`\n*Filtre silmek icin:* \`${client.config.Prefix}filter sil [@kullanici / #kanal / @rol]\``;

                const refreshButton = new ButtonBuilder().setCustomId("filter_refresh").setLabel("Panel Yenile").setStyle(ButtonStyle.Secondary);
                const addButton = new ButtonBuilder().setCustomId("filter_add").setLabel("Filtre Ekle").setStyle(ButtonStyle.Success);
                const removeButton = new ButtonBuilder().setCustomId("filter_remove").setLabel("Filtre Kaldir").setStyle(ButtonStyle.Danger);
                const row = new ActionRowBuilder().addComponents(refreshButton, addButton, removeButton);

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
                await interaction.editReply({ components: [container], files: [attachment], flags: Discord.MessageFlags.IsComponentsV2 });
                return;
            }

            if (interaction.customId === "filter_add") {
                const modal = new ModalBuilder().setCustomId("modal_filter_add").setTitle("Filtre Ekle");
                const targetInput = new TextInputBuilder().setCustomId("filter_target_input").setLabel("Kullanici, Kanal veya Rol (Etiket/ID)").setPlaceholder("@kullanici, #kanal, @rol veya duz ID girin").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(targetInput));
                await interaction.showModal(modal);
                return;
            }

            if (interaction.customId === "filter_remove") {
                const modal = new ModalBuilder().setCustomId("modal_filter_remove").setTitle("Filtre Kaldir");
                const targetInput = new TextInputBuilder().setCustomId("filter_target_input").setLabel("Kullanici, Kanal veya Rol (Etiket/ID)").setPlaceholder("@kullanici, #kanal, @rol veya duz ID girin").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(targetInput));
                await interaction.showModal(modal);
                return;
            }

            if (!interaction.customId.startsWith("btn_setup_")) return;

            if (!isDeveloper) {
                return interaction.reply({ content: "❌ Bu paneli sadece bot gelistiricileri kullanabilir.", ephemeral: true });
            }

            const guildConfig = await client.getSettings(guildId);
            const actionType = interaction.customId.replace("btn_setup_", "");

            if (actionType === "back") {
                await interaction.deferUpdate();
                return updateDashboardMessage(client, guildConfig, interaction, [getMainButtonsRow()]);
            }

            if (actionType === "back_odalar") {
                await interaction.deferUpdate();
                const chooseCatMenu = new StringSelectMenuBuilder()
                    .setCustomId("sel_setup_choosecat")
                    .setPlaceholder("Ses Odasi Eklemek Istediginiz Kategoriyi Secin...")
                    .addOptions([
                        { label: "Public Ses", value: "cat_sel_public" },
                        { label: "Oyun Ses", value: "cat_sel_game" },
                        { label: "Yayin Ses", value: "cat_sel_stream" },
                        { label: "Yetkili Ses", value: "cat_sel_staff" },
                        { label: "Kayit Ses", value: "cat_sel_register" }
                    ]);
                const rowMenu = new ActionRowBuilder().addComponents(chooseCatMenu);
                const rowBack = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("btn_setup_back").setLabel("⬅️ Paneli Guncelle & Geri Don").setStyle(ButtonStyle.Secondary)
                );
                return updateDashboardMessage(client, guildConfig, interaction, [rowMenu, rowBack]);
            }

            if (actionType === "genel") {
                await interaction.deferUpdate();
                return updateDashboardMessage(client, guildConfig, interaction, getGenelSistemRows(guildConfig, interaction));
            }

            if (actionType === "twitch") {
                const modal = new ModalBuilder().setCustomId("modal_setup_twitch").setTitle("Twitch & Durum Ayarlari");
                const twitchInput = new TextInputBuilder().setCustomId("inp_twitch_url").setLabel("Twitch Yayin Linki (Mor Durum Icin)").setStyle(TextInputStyle.Short).setValue(guildConfig.twitchURL || "").setRequired(false).setPlaceholder("Ornek: https://twitch.tv/loki");
                const statusInput = new TextInputBuilder().setCustomId("inp_status_text").setLabel("Durum Yayin Basligi Yazisi").setStyle(TextInputStyle.Short).setValue(guildConfig.activityName || "").setRequired(true).setPlaceholder("Durumda ne yazsin?");
                modal.addComponents(new ActionRowBuilder().addComponents(twitchInput), new ActionRowBuilder().addComponents(statusInput));
                return interaction.showModal(modal);
            }

            if (actionType === "kanallar") {
                await interaction.deferUpdate();
                const selectChans = new ChannelSelectMenuBuilder()
                    .setCustomId("sel_setup_allowedchans")
                    .setPlaceholder("Izinli Komut Kanallarini Secin (Coklu Secebilirsiniz)...")
                    .addChannelTypes(ChannelType.GuildText)
                    .setMinValues(0).setMaxValues(25);
                if (guildConfig.allowedChannels && guildConfig.allowedChannels.length > 0) {
                    const validIds = guildConfig.allowedChannels.filter((id) => interaction.guild.channels.cache.has(id));
                    if (validIds.length > 0) selectChans.setDefaultChannels(...validIds);
                }
                const rowChans = new ActionRowBuilder().addComponents(selectChans);
                const rowBack = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("btn_setup_back").setLabel("⬅️ Paneli Guncelle & Geri Don").setStyle(ButtonStyle.Secondary)
                );
                return updateDashboardMessage(client, guildConfig, interaction, [rowChans, rowBack]);
            }

            if (actionType === "carpanlar") {
                const modal = new ModalBuilder().setCustomId("modal_setup_carpanlar").setTitle("Kategori Puan Carpanlari");
                const getVal = (key) => guildConfig.voiceCategories.get(key)?.multiplier?.toString() || "1";
                const pInput = new TextInputBuilder().setCustomId("inp_m_public").setLabel("Public Carpani (Ornek: 2)").setStyle(TextInputStyle.Short).setValue(getVal("public")).setRequired(true);
                const gInput = new TextInputBuilder().setCustomId("inp_m_game").setLabel("Oyun Carpani (Ornek: 1.5)").setStyle(TextInputStyle.Short).setValue(getVal("game")).setRequired(true);
                const sInput = new TextInputBuilder().setCustomId("inp_m_stream").setLabel("Yayin Carpani (Ornek: 2.5)").setStyle(TextInputStyle.Short).setValue(getVal("stream")).setRequired(true);
                const stInput = new TextInputBuilder().setCustomId("inp_m_staff").setLabel("Yetkili Carpani (Ornek: 3)").setStyle(TextInputStyle.Short).setValue(getVal("staff")).setRequired(true);
                const rInput = new TextInputBuilder().setCustomId("inp_m_register").setLabel("Kayit Carpani (Ornek: 1)").setStyle(TextInputStyle.Short).setValue(getVal("register")).setRequired(true);
                modal.addComponents(
                    new ActionRowBuilder().addComponents(pInput),
                    new ActionRowBuilder().addComponents(gInput),
                    new ActionRowBuilder().addComponents(sInput),
                    new ActionRowBuilder().addComponents(stInput),
                    new ActionRowBuilder().addComponents(rInput)
                );
                return interaction.showModal(modal);
            }

            if (actionType === "odalar") {
                await interaction.deferUpdate();
                const chooseCatMenu = new StringSelectMenuBuilder()
                    .setCustomId("sel_setup_choosecat")
                    .setPlaceholder("Ses Odasi Eklemek Istediginiz Kategoriyi Secin...")
                    .addOptions([
                        { label: "Public Ses", value: "cat_sel_public" },
                        { label: "Oyun Ses", value: "cat_sel_game" },
                        { label: "Yayin Ses", value: "cat_sel_stream" },
                        { label: "Yetkili Ses", value: "cat_sel_staff" },
                        { label: "Kayit Ses", value: "cat_sel_register" }
                    ]);
                const rowMenu = new ActionRowBuilder().addComponents(chooseCatMenu);
                const rowBack = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("btn_setup_back").setLabel("⬅️ Paneli Guncelle & Geri Don").setStyle(ButtonStyle.Secondary)
                );
                return updateDashboardMessage(client, guildConfig, interaction, [rowMenu, rowBack]);
            }
        }

        // --- 2. SEÇİM MENÜSÜ ETKİLEŞİMLERİ ---
        if (interaction.isChannelSelectMenu() || interaction.isStringSelectMenu() || interaction.isRoleSelectMenu()) {
            if (!interaction.customId.startsWith("sel_setup_")) return;

            await interaction.deferUpdate();
            const guildConfig = await client.getSettings(guildId);

            if (interaction.customId === "sel_setup_botvoice") {
                const selectedVoiceId = interaction.values[0] || "";
                guildConfig.botVoiceChannelID = selectedVoiceId;
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);
                if (selectedVoiceId) {
                    const voiceChannel = interaction.guild?.channels.cache.get(selectedVoiceId);
                    if (voiceChannel && voiceChannel.isVoiceBased()) {
                        try {
                            const { joinVoiceChannel } = require("@discordjs/voice");
                            joinVoiceChannel({ channelId: voiceChannel.id, guildId: voiceChannel.guild.id, adapterCreator: voiceChannel.guild.voiceAdapterCreator, selfMute: false, selfDeaf: true });
                        } catch (err) {
                            console.error("[Ses Baglantisi] Anlik ses kanalina baglanirken hata:", err);
                        }
                    }
                }
                return updateDashboardMessage(client, guildConfig, interaction, getGenelSistemRows(guildConfig, interaction));
            }

            if (interaction.customId === "sel_setup_logchannel") {
                guildConfig.logChannelID = interaction.values[0] || "";
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);
                return updateDashboardMessage(client, guildConfig, interaction, getGenelSistemRows(guildConfig, interaction));
            }

            if (interaction.customId === "sel_setup_staffroles") {
                guildConfig.staffRoles = interaction.values;
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);
                return updateDashboardMessage(client, guildConfig, interaction, getGenelSistemRows(guildConfig, interaction));
            }

            if (interaction.customId === "sel_setup_allowedchans") {
                guildConfig.allowedChannels = interaction.values;
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);
                const selectChans = new ChannelSelectMenuBuilder()
                    .setCustomId("sel_setup_allowedchans")
                    .setPlaceholder("Izinli Komut Kanallarini Secin (Coklu Secebilirsiniz)...")
                    .addChannelTypes(ChannelType.GuildText)
                    .setMinValues(0).setMaxValues(25);
                if (guildConfig.allowedChannels && guildConfig.allowedChannels.length > 0) {
                    const validIds = guildConfig.allowedChannels.filter((id) => interaction.guild.channels.cache.has(id));
                    if (validIds.length > 0) selectChans.setDefaultChannels(...validIds);
                }
                const rowChans = new ActionRowBuilder().addComponents(selectChans);
                const rowBack = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("btn_setup_back").setLabel("⬅️ Paneli Guncelle & Geri Don").setStyle(ButtonStyle.Secondary)
                );
                return updateDashboardMessage(client, guildConfig, interaction, [rowChans, rowBack]);
            }

            if (interaction.customId === "sel_setup_choosecat" && interaction.isStringSelectMenu()) {
                const chosenVal = interaction.values[0];
                const catKey = chosenVal.replace("cat_sel_", "");
                const selectCatChans = new ChannelSelectMenuBuilder()
                    .setCustomId(`sel_setup_catchans_${catKey}`)
                    .setPlaceholder(`[${catKey.toUpperCase()}] Kategorisi Sunucu Kategorilerini Secin...`)
                    .addChannelTypes(ChannelType.GuildCategory)
                    .setMinValues(0).setMaxValues(25);
                const cat = guildConfig.voiceCategories.get(catKey);
                if (cat && cat.channels && cat.channels.length > 0) {
                    const validIds = cat.channels.filter((id) => interaction.guild.channels.cache.has(id));
                    if (validIds.length > 0) selectCatChans.setDefaultChannels(...validIds);
                }
                const rowChans = new ActionRowBuilder().addComponents(selectCatChans);
                const rowBack = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("btn_setup_back_odalar").setLabel("⬅️ Kategorilere Geri Don").setStyle(ButtonStyle.Secondary)
                );
                return updateDashboardMessage(client, guildConfig, interaction, [rowChans, rowBack]);
            }

            if (interaction.customId.startsWith("sel_setup_catchans_")) {
                const catKey = interaction.customId.replace("sel_setup_catchans_", "");
                const cat = guildConfig.voiceCategories.get(catKey);
                cat.channels = interaction.values;
                guildConfig.voiceCategories.set(catKey, cat);
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);

                const selectCatChans = new ChannelSelectMenuBuilder()
                    .setCustomId(`sel_setup_catchans_${catKey}`)
                    .setPlaceholder(`[${catKey.toUpperCase()}] Kategorisi Sunucu Kategorilerini Secin...`)
                    .addChannelTypes(ChannelType.GuildCategory)
                    .setMinValues(0).setMaxValues(25);
                if (cat.channels && cat.channels.length > 0) {
                    const validIds = cat.channels.filter((id) => interaction.guild.channels.cache.has(id));
                    if (validIds.length > 0) selectCatChans.setDefaultChannels(...validIds);
                }
                const rowChans = new ActionRowBuilder().addComponents(selectCatChans);
                const rowBack = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("btn_setup_back_odalar").setLabel("⬅️ Kategorilere Geri Don").setStyle(ButtonStyle.Secondary)
                );
                return updateDashboardMessage(client, guildConfig, interaction, [rowChans, rowBack]);
            }
        }

        // --- 3. MODAL GÖNDERİM ETKİLEŞİMLERİ ---
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith("modal_filter_")) {
                await interaction.deferUpdate();
                const action = interaction.customId.replace("modal_filter_", "");
                const targetRaw = interaction.fields.getTextInputValue("filter_target_input").trim();

                const guildConfig = await client.getSettings(guildId);
                if (!guildConfig.filteredUsers) guildConfig.filteredUsers = [];
                if (!guildConfig.filteredChannels) guildConfig.filteredChannels = [];
                if (!guildConfig.filteredRoles) guildConfig.filteredRoles = [];

                const idMatch = targetRaw.match(/\d+/);
                const targetId = idMatch ? idMatch[0] : null;
                let resolvedType = null;

                if (targetId) {
                    if (interaction.guild.members.cache.has(targetId) || await client.users.fetch(targetId).catch(() => null)) {
                        resolvedType = "user";
                    } else if (interaction.guild.channels.cache.has(targetId)) {
                        resolvedType = "channel";
                    } else if (interaction.guild.roles.cache.has(targetId)) {
                        resolvedType = "role";
                    }
                }

                if (!resolvedType) {
                    const cleanName = targetRaw.toLowerCase();
                    const foundChan = interaction.guild.channels.cache.find((c) => c.name.toLowerCase() === cleanName);
                    if (foundChan) {
                        resolvedType = "channel";
                        if (action === "add") {
                            if (!guildConfig.filteredChannels.includes(foundChan.id)) guildConfig.filteredChannels.push(foundChan.id);
                        } else {
                            guildConfig.filteredChannels = guildConfig.filteredChannels.filter((id) => id !== foundChan.id);
                        }
                    } else {
                        const foundRole = interaction.guild.roles.cache.find((r) => r.name.toLowerCase() === cleanName);
                        if (foundRole) {
                            resolvedType = "role";
                            if (action === "add") {
                                if (!guildConfig.filteredRoles.includes(foundRole.id)) guildConfig.filteredRoles.push(foundRole.id);
                            } else {
                                guildConfig.filteredRoles = guildConfig.filteredRoles.filter((id) => id !== foundRole.id);
                            }
                        }
                    }
                } else if (targetId) {
                    if (action === "add") {
                        if (resolvedType === "user") { if (!guildConfig.filteredUsers.includes(targetId)) guildConfig.filteredUsers.push(targetId); }
                        else if (resolvedType === "channel") { if (!guildConfig.filteredChannels.includes(targetId)) guildConfig.filteredChannels.push(targetId); }
                        else if (resolvedType === "role") { if (!guildConfig.filteredRoles.includes(targetId)) guildConfig.filteredRoles.push(targetId); }
                    } else if (action === "remove") {
                        if (resolvedType === "user") guildConfig.filteredUsers = guildConfig.filteredUsers.filter((id) => id !== targetId);
                        else if (resolvedType === "channel") guildConfig.filteredChannels = guildConfig.filteredChannels.filter((id) => id !== targetId);
                        else if (resolvedType === "role") guildConfig.filteredRoles = guildConfig.filteredRoles.filter((id) => id !== targetId);
                    }
                }

                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);

                const usersList = [];
                for (const id of guildConfig.filteredUsers) {
                    const user = await client.users.fetch(id).catch(() => undefined);
                    if (user) usersList.push({ name: user.username, avatarUrl: user.displayAvatarURL({ extension: "png", size: 64 }) });
                    else usersList.push({ name: `Bilinmeyen Uye (${id})`, avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png" });
                }
                const channelsList = [];
                for (const id of guildConfig.filteredChannels) {
                    const chan = interaction.guild.channels.cache.get(id);
                    channelsList.push(chan ? chan.name : `kanal-${id}`);
                }
                const rolesList = [];
                for (const id of guildConfig.filteredRoles) {
                    const role = interaction.guild.roles.cache.get(id);
                    rolesList.push({ name: role ? role.name : `rol-${id}`, color: role ? role.hexColor : "#9b59b6" });
                }

                const { CanvasHelper: CanvasRef } = require("../../Global/Utils/CanvasHelper");
                const filterBuffer = await CanvasRef.drawFilterCard({ users: usersList, channels: channelsList, roles: rolesList });
                const embedHeader = `**Istatistik Filtre Yonetim Paneli**\n\n*Filtre eklemek icin:* \`${client.config.Prefix}filter ekle [@kullanici / #kanal / @rol]\`\n*Filtre silmek icin:* \`${client.config.Prefix}filter sil [@kullanici / #kanal / @rol]\``;

                const refreshButton = new ButtonBuilder().setCustomId("filter_refresh").setLabel("Panel Yenile").setStyle(ButtonStyle.Secondary);
                const addButton = new ButtonBuilder().setCustomId("filter_add").setLabel("Filtre Ekle").setStyle(ButtonStyle.Success);
                const removeButton = new ButtonBuilder().setCustomId("filter_remove").setLabel("Filtre Kaldir").setStyle(ButtonStyle.Danger);
                const row = new ActionRowBuilder().addComponents(refreshButton, addButton, removeButton);

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
                await interaction.editReply({ components: [container], files: [attachment], flags: Discord.MessageFlags.IsComponentsV2 });
                return;
            }

            if (!interaction.customId.startsWith("modal_setup_")) return;

            await interaction.deferUpdate();
            const guildConfig = await client.getSettings(guildId);
            const modalType = interaction.customId.replace("modal_setup_", "");

            if (modalType === "twitch") {
                const twitchUrl = interaction.fields.getTextInputValue("inp_twitch_url").trim();
                const statusText = interaction.fields.getTextInputValue("inp_status_text").trim();
                guildConfig.twitchURL = twitchUrl || "";
                guildConfig.activityName = statusText || "";
                client.user.setPresence({ activities: [{ name: statusText, type: 3, url: twitchUrl }], status: "online" });
            } else if (modalType === "carpanlar") {
                const keys = ["public", "game", "stream", "staff", "register"];
                for (const key of keys) {
                    const val = parseFloat(interaction.fields.getTextInputValue(`inp_m_${key}`).trim());
                    if (!isNaN(val) && val >= 0) {
                        const cat = guildConfig.voiceCategories.get(key);
                        cat.multiplier = val;
                        guildConfig.voiceCategories.set(key, cat);
                    }
                }
            }

            await guildConfig.save();
            client.guildConfigs.set(guildId, guildConfig);
            return updateDashboardMessage(client, guildConfig, interaction, [getMainButtonsRow()]);
        }
    }
};
