import * as Discord from "discord.js";
import { 
    Interaction, 
    ModalBuilder, 
    EmbedBuilder,
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    ModalActionRowComponentBuilder,
    AttachmentBuilder,
    ChannelSelectMenuBuilder,
    StringSelectMenuBuilder,
    ChannelType,
    ButtonBuilder,
    ButtonStyle,
    RoleSelectMenuBuilder
} from "discord.js";

// Main Button Menu Helper
function getMainButtonsRow() {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("btn_setup_genel").setLabel("Genel Sistem").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("btn_setup_twitch").setLabel("Twitch & Durum").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("btn_setup_kanallar").setLabel("Komut Kanalları").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("btn_setup_carpanlar").setLabel("Kategori Çarpanları").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("btn_setup_odalar").setLabel("Kategori Odaları").setStyle(ButtonStyle.Secondary)
    );
}

// Genel Sistem Menüleri Yardımcı Fonksiyonu
function getGenelSistemRows(guildConfig: any, interaction: any) {
    const selectVoice = new ChannelSelectMenuBuilder()
        .setCustomId("sel_setup_botvoice")
        .setPlaceholder("Botun Gireceği Ses Kanalını Seçin...")
        .addChannelTypes(ChannelType.GuildVoice)
        .setMinValues(0)
        .setMaxValues(1);

    if (guildConfig.botVoiceChannelID && interaction.guild!.channels.cache.has(guildConfig.botVoiceChannelID)) {
        selectVoice.setDefaultChannels(guildConfig.botVoiceChannelID);
    }

    const selectLog = new ChannelSelectMenuBuilder()
        .setCustomId("sel_setup_logchannel")
        .setPlaceholder("Sıfırlama Log Kanalını Seçin...")
        .addChannelTypes(ChannelType.GuildText)
        .setMinValues(0)
        .setMaxValues(1);

    if (guildConfig.logChannelID && interaction.guild!.channels.cache.has(guildConfig.logChannelID)) {
        selectLog.setDefaultChannels(guildConfig.logChannelID);
    }

    const selectRoles = new RoleSelectMenuBuilder()
        .setCustomId("sel_setup_staffroles")
        .setPlaceholder("Yetkili Rollerini Seçin (Çoklu Seçebilirsiniz)...")
        .setMinValues(0)
        .setMaxValues(25);

    if (guildConfig.staffRoles && guildConfig.staffRoles.length > 0) {
        const validIds = guildConfig.staffRoles.filter((id: string) => interaction.guild!.roles.cache.has(id));
        if (validIds.length > 0) {
            selectRoles.setDefaultRoles(...validIds);
        }
    }

    const rowVoice = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(selectVoice);
    const rowLog = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(selectLog);
    const rowRoles = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(selectRoles);
    const rowBack = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("btn_setup_back").setLabel("⬅️ Paneli Güncelle & Geri Dön").setStyle(ButtonStyle.Secondary)
    );

    return [rowVoice, rowLog, rowRoles, rowBack];
}

// Canvas Redraw Helper
async function updateDashboardMessage(client: any, guildConfig: any, interaction: any, components: any[]) {
    const allowedChannelsNames = guildConfig.allowedChannels.map((id: string) => {
        const ch = interaction.guild!.channels.cache.get(id);
        return ch ? `#${ch.name}` : id;
    });

    const botVoiceChannelName = guildConfig.botVoiceChannelID
        ? (interaction.guild!.channels.cache.get(guildConfig.botVoiceChannelID)?.name || guildConfig.botVoiceChannelID)
        : "Ayarlanmamış";

    const logChannelName = guildConfig.logChannelID
        ? (interaction.guild!.channels.cache.get(guildConfig.logChannelID)?.name || guildConfig.logChannelID)
        : "Ayarlanmamış";

    // Ses Kategorilerini derleyelim (Düzgün Sıralı & Çözümlenmiş Gerçek Ses Odalarıyla)
    const categoriesData: any[] = [];
    const orderedKeys = ["public", "game", "stream", "staff", "register"];
    for (const key of orderedKeys) {
        const cat = guildConfig.voiceCategories.get(key);
        if (cat) {
            const resolvedNames: string[] = [];
            for (const id of (cat.channels || [])) {
                const ch = interaction.guild!.channels.cache.get(id);
                if (ch) {
                    if (ch.type === ChannelType.GuildCategory) {
                        // Kategori altındaki tüm ses kanallarını bulalım
                        const subChans = interaction.guild!.channels.cache.filter((c: any) => c.parentId === ch.id && c.isVoiceBased());
                        subChans.forEach((vc: any) => resolvedNames.push(vc.name));
                    } else {
                        resolvedNames.push(ch.name);
                    }
                } else {
                    resolvedNames.push(id);
                }
            }

            categoriesData.push({
                name: cat.name,
                key: key,
                multiplier: cat.multiplier,
                channelsCount: cat.channels ? cat.channels.length : 0,
                channelsList: resolvedNames
            });
        }
    }

    const staffRolesNames = (guildConfig.staffRoles || []).map((id: string) => {
        const role = interaction.guild!.roles.cache.get(id);
        return role ? `@${role.name}` : id;
    });

    const setupBuffer = await client.canvas.drawSetupCard({
        allowedChannels: allowedChannelsNames,
        botVoiceChannel: botVoiceChannelName,
        logChannel: logChannelName,
        twitchURL: guildConfig.twitchURL || "Ayarlanmamış",
        activityName: guildConfig.activityName || "Ayarlanmamış",
        staffRoles: staffRolesNames,
        voiceCategories: categoriesData
    });

    const attachment = new AttachmentBuilder(setupBuffer, { name: "loki_setup_dashboard.png" });

    if (interaction.message) {
        await (interaction.message as any).edit({
            content: "",
            files: [attachment],
            components: components
        });
    }
}

export default {
    name: "interactionCreate",
    execute: async (client: any, interaction: Interaction) => {
        const guildId = interaction.guild?.id;
        if (!guildId) return;

        // Yetkili Geliştirici Kontrolü (client.config üzerinden)
        const isDeveloper = client.config.Developers.includes(interaction.user.id);

        // --- 1. BUTON ETKİLEŞİMLERİ ---
        if (interaction.isButton()) {
            if (interaction.customId.startsWith("help_")) {
                await interaction.deferUpdate();
                const cat = interaction.customId.replace("help_", "") as "home" | "root" | "stats";

                const { CanvasHelper: CanvasRef } = require("../../Global/Utils/CanvasHelper");
                const helpBuffer = await CanvasRef.drawHelpCard({
                    category: cat
                });

                const embedHeader = `**Loki İstatistik ve Yönetim Sistemi Kılavuzu**\n\n*Aşağıdaki butonları kullanarak sekmeler arasında dinamik olarak geçiş yapabilir, komut detaylarına ve kullanımlarına ulaşabilirsiniz.*`;

                const homeButton = new ButtonBuilder()
                    .setCustomId("help_home")
                    .setLabel("Ana Sayfa")
                    .setStyle(ButtonStyle.Secondary);

                const rootButton = new ButtonBuilder()
                    .setCustomId("help_root")
                    .setLabel("Yönetim Komutları")
                    .setStyle(ButtonStyle.Secondary);

                const statsButton = new ButtonBuilder()
                    .setCustomId("help_stats")
                    .setLabel("İstatistik Komutları")
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(homeButton, rootButton, statsButton);

                const gallery = new (Discord as any).MediaGalleryBuilder()
                    .addItems(
                        new (Discord as any).MediaGalleryItemBuilder()
                            .setURL("attachment://loki_help_panel.png")
                    );

                const container = new (Discord as any).ContainerBuilder()
                    .addMediaGalleryComponents(gallery)
                    .addSeparatorComponents(new (Discord as any).SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new (Discord as any).TextDisplayBuilder().setContent(embedHeader))
                    .addSeparatorComponents(new (Discord as any).SeparatorBuilder().setDivider(true))
                    .addActionRowComponents(row);

                const attachment = new AttachmentBuilder(helpBuffer, { name: "loki_help_panel.png" });

                await interaction.editReply({
                    components: [container],
                    files: [attachment],
                    flags: (Discord as any).MessageFlags.IsComponentsV2
                });
                return;
            }

            if (interaction.customId === "filter_refresh") {
                await interaction.deferUpdate();
                const guildConfig = await client.getSettings(guildId);

                // Dizileri garantiye alalım
                if (!guildConfig.filteredUsers) guildConfig.filteredUsers = [];
                if (!guildConfig.filteredChannels) guildConfig.filteredChannels = [];
                if (!guildConfig.filteredRoles) guildConfig.filteredRoles = [];

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
                    const chan = interaction.guild!.channels.cache.get(id);
                    channelsList.push(chan ? (chan as any).name : `kanal-${id}`);
                }

                // Filtrelenen Rolleri Çekelim
                const rolesList = [];
                for (const id of guildConfig.filteredRoles) {
                    const role = interaction.guild!.roles.cache.get(id);
                    rolesList.push({
                        name: role ? role.name : `rol-${id}`,
                        color: role ? role.hexColor : "#9b59b6"
                    });
                }

                // Kartı Çiz
                const { CanvasHelper: CanvasRef } = require("../../Global/Utils/CanvasHelper");
                const filterBuffer = await CanvasRef.drawFilterCard({
                    users: usersList,
                    channels: channelsList,
                    roles: rolesList
                });

                const embedHeader = `**İstatistik Filtre Yönetim Paneli**\n\n*Filtre eklemek için:* \`${client.config.Prefix}filter ekle [@kullanici / #kanal / @rol]\`\n*Filtre silmek için:* \`${client.config.Prefix}filter sil [@kullanici / #kanal / @rol]\``;

                const refreshButton = new ButtonBuilder()
                    .setCustomId("filter_refresh")
                    .setLabel("Panel Yenile")
                    .setStyle(ButtonStyle.Secondary);

                const addButton = new ButtonBuilder()
                    .setCustomId("filter_add")
                    .setLabel("Filtre Ekle")
                    .setStyle(ButtonStyle.Success);

                const removeButton = new ButtonBuilder()
                    .setCustomId("filter_remove")
                    .setLabel("Filtre Kaldır")
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(refreshButton, addButton, removeButton);

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

                await interaction.editReply({
                    components: [container],
                    files: [attachment],
                    flags: (Discord as any).MessageFlags.IsComponentsV2
                });
                return;
            }

            if (interaction.customId === "filter_add") {
                const modal = new ModalBuilder()
                    .setCustomId("modal_filter_add")
                    .setTitle("Filtre Ekle");

                const targetInput = new TextInputBuilder()
                    .setCustomId("filter_target_input")
                    .setLabel("Kullanıcı, Kanal veya Rol (Etiket/ID)")
                    .setPlaceholder("@kullanici, #kanal, @rol veya düz ID girin")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const rowInput = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(targetInput);
                modal.addComponents(rowInput);

                await interaction.showModal(modal);
                return;
            }

            if (interaction.customId === "filter_remove") {
                const modal = new ModalBuilder()
                    .setCustomId("modal_filter_remove")
                    .setTitle("Filtre Kaldır");

                const targetInput = new TextInputBuilder()
                    .setCustomId("filter_target_input")
                    .setLabel("Kullanıcı, Kanal veya Rol (Etiket/ID)")
                    .setPlaceholder("@kullanici, #kanal, @rol veya düz ID girin")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const rowInput = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(targetInput);
                modal.addComponents(rowInput);

                await interaction.showModal(modal);
                return;
            }

            if (!interaction.customId.startsWith("btn_setup_")) return;

            if (!isDeveloper) {
                return interaction.reply({ 
                    content: "❌ Bu paneli sadece bot geliştiricileri kullanabilir.", 
                    ephemeral: true 
                });
            }

            const guildConfig = await client.getSettings(guildId);
            const actionType = interaction.customId.replace("btn_setup_", "");

            // Geri Dön / Tamamla Butonu
            if (actionType === "back") {
                await interaction.deferUpdate();
                return updateDashboardMessage(client, guildConfig, interaction, [getMainButtonsRow()]);
            }

            // Kategori Seçimine Geri Dön Butonu
            if (actionType === "back_odalar") {
                await interaction.deferUpdate();
                const chooseCatMenu = new StringSelectMenuBuilder()
                    .setCustomId("sel_setup_choosecat")
                    .setPlaceholder("Ses Odası Eklemek İstediğiniz Kategoriyi Seçin...")
                    .addOptions([
                        { label: "Public Ses", value: "cat_sel_public" },
                        { label: "Oyun Ses", value: "cat_sel_game" },
                        { label: "Yayın Ses", value: "cat_sel_stream" },
                        { label: "Yetkili Ses", value: "cat_sel_staff" },
                        { label: "Kayıt Ses", value: "cat_sel_register" }
                    ]);

                const rowMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(chooseCatMenu);
                const rowBack = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("btn_setup_back").setLabel("⬅️ Paneli Güncelle & Geri Dön").setStyle(ButtonStyle.Secondary)
                );

                return updateDashboardMessage(client, guildConfig, interaction, [rowMenu, rowBack]);
            }

            // A. Genel Sistem Ayarları Menüsü
            if (actionType === "genel") {
                await interaction.deferUpdate();
                return updateDashboardMessage(client, guildConfig, interaction, getGenelSistemRows(guildConfig, interaction));
            }

            // B. Twitch & Durum Modalı (Metin veri olduğu için Modal kullanılır)
            if (actionType === "twitch") {
                const modal = new ModalBuilder()
                    .setCustomId("modal_setup_twitch")
                    .setTitle("Twitch & Durum Ayarları");

                const twitchInput = new TextInputBuilder()
                    .setCustomId("inp_twitch_url")
                    .setLabel("Twitch Yayın Linki (Mor Durum İçin)")
                    .setStyle(TextInputStyle.Short)
                    .setValue(guildConfig.twitchURL || "")
                    .setRequired(false)
                    .setPlaceholder("Örn: https://twitch.tv/loki");

                const statusInput = new TextInputBuilder()
                    .setCustomId("inp_status_text")
                    .setLabel("Durum Yayın Başlığı Yazısı")
                    .setStyle(TextInputStyle.Short)
                    .setValue(guildConfig.activityName || "")
                    .setRequired(true)
                    .setPlaceholder("Durumda ne yazsın?");

                const r1 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(twitchInput);
                const r2 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(statusInput);
                modal.addComponents(r1, r2);

                return interaction.showModal(modal);
            }

            // C. İzinli Komut Kanalları Menüsü
            if (actionType === "kanallar") {
                await interaction.deferUpdate();

                const selectChans = new ChannelSelectMenuBuilder()
                    .setCustomId("sel_setup_allowedchans")
                    .setPlaceholder("İzinli Komut Kanallarını Seçin (Çoklu Seçebilirsiniz)...")
                    .addChannelTypes(ChannelType.GuildText)
                    .setMinValues(0)
                    .setMaxValues(25);

                if (guildConfig.allowedChannels && guildConfig.allowedChannels.length > 0) {
                    const validIds = guildConfig.allowedChannels.filter((id: string) => interaction.guild!.channels.cache.has(id));
                    if (validIds.length > 0) {
                        selectChans.setDefaultChannels(...validIds);
                    }
                }

                const rowChans = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(selectChans);
                const rowBack = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("btn_setup_back").setLabel("⬅️ Paneli Güncelle & Geri Dön").setStyle(ButtonStyle.Secondary)
                );

                return updateDashboardMessage(client, guildConfig, interaction, [rowChans, rowBack]);
            }

            // D. Kategori Puan Çarpanları Modalı (Sayısal veri olduğu için Modal kullanılır)
            if (actionType === "carpanlar") {
                const modal = new ModalBuilder()
                    .setCustomId("modal_setup_carpanlar")
                    .setTitle("Kategori Puan Çarpanları");

                const getVal = (key: string) => guildConfig.voiceCategories.get(key)?.multiplier?.toString() || "1";

                const pInput = new TextInputBuilder().setCustomId("inp_m_public").setLabel("Public Çarpanı (Örn: 2)").setStyle(TextInputStyle.Short).setValue(getVal("public")).setRequired(true);
                const gInput = new TextInputBuilder().setCustomId("inp_m_game").setLabel("Oyun Çarpanı (Örn: 1.5)").setStyle(TextInputStyle.Short).setValue(getVal("game")).setRequired(true);
                const sInput = new TextInputBuilder().setCustomId("inp_m_stream").setLabel("Yayın Çarpanı (Örn: 2.5)").setStyle(TextInputStyle.Short).setValue(getVal("stream")).setRequired(true);
                const stInput = new TextInputBuilder().setCustomId("inp_m_staff").setLabel("Yetkili Çarpanı (Örn: 3)").setStyle(TextInputStyle.Short).setValue(getVal("staff")).setRequired(true);
                const rInput = new TextInputBuilder().setCustomId("inp_m_register").setLabel("Kayıt Çarpanı (Örn: 1)").setStyle(TextInputStyle.Short).setValue(getVal("register")).setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(pInput),
                    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(gInput),
                    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(sInput),
                    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(stInput),
                    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(rInput)
                );

                return interaction.showModal(modal);
            }

            // E. Kategori Odaları Menüsü
            if (actionType === "odalar") {
                await interaction.deferUpdate();

                const chooseCatMenu = new StringSelectMenuBuilder()
                    .setCustomId("sel_setup_choosecat")
                    .setPlaceholder("Ses Odası Eklemek İstediğiniz Kategoriyi Seçin...")
                    .addOptions([
                        { label: "Public Ses", value: "cat_sel_public" },
                        { label: "Oyun Ses", value: "cat_sel_game" },
                        { label: "Yayın Ses", value: "cat_sel_stream" },
                        { label: "Yetkili Ses", value: "cat_sel_staff" },
                        { label: "Kayıt Ses", value: "cat_sel_register" }
                    ]);

                const rowMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(chooseCatMenu);
                const rowBack = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("btn_setup_back").setLabel("⬅️ Paneli Güncelle & Geri Dön").setStyle(ButtonStyle.Secondary)
                );

                return updateDashboardMessage(client, guildConfig, interaction, [rowMenu, rowBack]);
            }
        }

        // --- 2. SEÇİM MENÜSÜ ETKİLEŞİMLERİ (SELECT MENUS) ---
        if (interaction.isChannelSelectMenu() || interaction.isStringSelectMenu() || interaction.isRoleSelectMenu()) {
            if (!interaction.customId.startsWith("sel_setup_")) return;

            await interaction.deferUpdate();
            const guildConfig = await client.getSettings(guildId);

            // A. Bot Ses Kanalı Seçimi
            if (interaction.customId === "sel_setup_botvoice") {
                const selectedVoiceId = interaction.values[0] || "";
                guildConfig.botVoiceChannelID = selectedVoiceId;
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);

                // Botun anlık olarak seçilen ses kanalına bağlanmasını sağla!
                if (selectedVoiceId) {
                    const voiceChannel = interaction.guild?.channels.cache.get(selectedVoiceId);
                    if (voiceChannel && voiceChannel.isVoiceBased()) {
                        try {
                            const { joinVoiceChannel } = require("@discordjs/voice");
                            joinVoiceChannel({
                                channelId: voiceChannel.id,
                                guildId: voiceChannel.guild.id,
                                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                                selfMute: false,
                                selfDeaf: true
                            });
                        } catch (err) {
                            console.error("[Ses Bağlantısı] Anlık ses kanalına bağlanırken hata:", err);
                        }
                    }
                }

                return updateDashboardMessage(client, guildConfig, interaction, getGenelSistemRows(guildConfig, interaction));
            }

            // B. Log Kanalı Seçimi
            if (interaction.customId === "sel_setup_logchannel") {
                guildConfig.logChannelID = interaction.values[0] || "";
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);

                return updateDashboardMessage(client, guildConfig, interaction, getGenelSistemRows(guildConfig, interaction));
            }

            // Yetkili Rolleri Seçimi
            if (interaction.customId === "sel_setup_staffroles") {
                guildConfig.staffRoles = interaction.values;
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);

                return updateDashboardMessage(client, guildConfig, interaction, getGenelSistemRows(guildConfig, interaction));
            }

            // C. İzinli Mesaj Kanalları Seçimi
            if (interaction.customId === "sel_setup_allowedchans") {
                guildConfig.allowedChannels = interaction.values;
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);

                const selectChans = new ChannelSelectMenuBuilder()
                    .setCustomId("sel_setup_allowedchans")
                    .setPlaceholder("İzinli Komut Kanallarını Seçin (Çoklu Seçebilirsiniz)...")
                    .addChannelTypes(ChannelType.GuildText)
                    .setMinValues(0)
                    .setMaxValues(25);

                if (guildConfig.allowedChannels && guildConfig.allowedChannels.length > 0) {
                    const validIds = guildConfig.allowedChannels.filter((id: string) => interaction.guild!.channels.cache.has(id));
                    if (validIds.length > 0) {
                        selectChans.setDefaultChannels(...validIds);
                    }
                }

                const rowChans = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(selectChans);
                const rowBack = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId("btn_setup_back").setLabel("⬅️ Paneli Güncelle & Geri Dön").setStyle(ButtonStyle.Secondary));

                return updateDashboardMessage(client, guildConfig, interaction, [rowChans, rowBack]);
            }

            // D. Kategori Seçimi (Odalar Ekranı İçin)
            if (interaction.customId === "sel_setup_choosecat" && interaction.isStringSelectMenu()) {
                const chosenVal = interaction.values[0]; // Örn: cat_sel_public
                const catKey = chosenVal.replace("cat_sel_", ""); // public

                const selectCatChans = new ChannelSelectMenuBuilder()
                    .setCustomId(`sel_setup_catchans_${catKey}`)
                    .setPlaceholder(`[${catKey.toUpperCase()}] Kategorisi Sunucu Kategorilerini Seçin...`)
                    .addChannelTypes(ChannelType.GuildCategory)
                    .setMinValues(0)
                    .setMaxValues(25);

                const cat = guildConfig.voiceCategories.get(catKey)!;
                if (cat && cat.channels && cat.channels.length > 0) {
                    const validIds = cat.channels.filter((id: string) => interaction.guild!.channels.cache.has(id));
                    if (validIds.length > 0) {
                        selectCatChans.setDefaultChannels(...validIds);
                    }
                }

                const rowChans = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(selectCatChans);
                const rowBack = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("btn_setup_back_odalar").setLabel("⬅️ Kategorilere Geri Dön").setStyle(ButtonStyle.Secondary)
                );

                // Menüyü yüklerken mevcut Canvas'ı koru
                return updateDashboardMessage(client, guildConfig, interaction, [rowChans, rowBack]);
            }

            // E. Seçilen Kategori Odalarını Kaydet
            if (interaction.customId.startsWith("sel_setup_catchans_")) {
                const catKey = interaction.customId.replace("sel_setup_catchans_", ""); // public
                
                const cat = guildConfig.voiceCategories.get(catKey)!;
                cat.channels = interaction.values;
                guildConfig.voiceCategories.set(catKey, cat);
                
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);

                // Seçim yapıldıktan sonra kanalları güncel tutarak menüyü koru
                const selectCatChans = new ChannelSelectMenuBuilder()
                    .setCustomId(`sel_setup_catchans_${catKey}`)
                    .setPlaceholder(`[${catKey.toUpperCase()}] Kategorisi Sunucu Kategorilerini Seçin...`)
                    .addChannelTypes(ChannelType.GuildCategory)
                    .setMinValues(0)
                    .setMaxValues(25);

                if (cat.channels && cat.channels.length > 0) {
                    const validIds = cat.channels.filter((id: string) => interaction.guild!.channels.cache.has(id));
                    if (validIds.length > 0) {
                        selectCatChans.setDefaultChannels(...validIds);
                    }
                }

                const rowChans = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(selectCatChans);
                const rowBack = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("btn_setup_back_odalar").setLabel("⬅️ Kategorilere Geri Dön").setStyle(ButtonStyle.Secondary)
                );

                return updateDashboardMessage(client, guildConfig, interaction, [rowChans, rowBack]);
            }
        }

        // --- 3. MODAL GÖNDERİM ETKİLEŞİMLERİ (MODALS) ---
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith("modal_filter_")) {
                await interaction.deferUpdate();
                const action = interaction.customId.replace("modal_filter_", ""); // "add" veya "remove"
                const targetRaw = interaction.fields.getTextInputValue("filter_target_input").trim();

                const guildConfig = await client.getSettings(guildId);

                // Dizileri garantiye alalım
                if (!guildConfig.filteredUsers) guildConfig.filteredUsers = [];
                if (!guildConfig.filteredChannels) guildConfig.filteredChannels = [];
                if (!guildConfig.filteredRoles) guildConfig.filteredRoles = [];

                // Regex ile ID'yi ayıklayalım (Etiketlerden ham ID'yi çeker)
                const idMatch = targetRaw.match(/\d+/);
                const targetId = idMatch ? idMatch[0] : null;

                let resolvedType: "user" | "channel" | "role" | null = null;

                if (targetId) {
                    if (interaction.guild!.members.cache.has(targetId) || await client.users.fetch(targetId).catch(() => null)) {
                        resolvedType = "user";
                    } else if (interaction.guild!.channels.cache.has(targetId)) {
                        resolvedType = "channel";
                    } else if (interaction.guild!.roles.cache.has(targetId)) {
                        resolvedType = "role";
                    }
                }

                if (!resolvedType) {
                    // Düz ada göre eşleştirmeyi deneyelim (Kanal veya Rol adı girilmişse)
                    const cleanName = targetRaw.toLowerCase();
                    const foundChan = interaction.guild!.channels.cache.find(c => c.name.toLowerCase() === cleanName);
                    if (foundChan) {
                        resolvedType = "channel";
                        if (action === "add") {
                            if (!guildConfig.filteredChannels.includes(foundChan.id)) guildConfig.filteredChannels.push(foundChan.id);
                        } else {
                            guildConfig.filteredChannels = guildConfig.filteredChannels.filter((id: string) => id !== foundChan.id);
                        }
                    } else {
                        const foundRole = interaction.guild!.roles.cache.find(r => r.name.toLowerCase() === cleanName);
                        if (foundRole) {
                            resolvedType = "role";
                            if (action === "add") {
                                if (!guildConfig.filteredRoles.includes(foundRole.id)) guildConfig.filteredRoles.push(foundRole.id);
                            } else {
                                guildConfig.filteredRoles = guildConfig.filteredRoles.filter((id: string) => id !== foundRole.id);
                            }
                        }
                    }
                } else if (targetId) {
                    if (action === "add") {
                        if (resolvedType === "user") {
                            if (!guildConfig.filteredUsers.includes(targetId)) guildConfig.filteredUsers.push(targetId);
                        } else if (resolvedType === "channel") {
                            if (!guildConfig.filteredChannels.includes(targetId)) guildConfig.filteredChannels.push(targetId);
                        } else if (resolvedType === "role") {
                            if (!guildConfig.filteredRoles.includes(targetId)) guildConfig.filteredRoles.push(targetId);
                        }
                    } else if (action === "remove") {
                        if (resolvedType === "user") {
                            guildConfig.filteredUsers = guildConfig.filteredUsers.filter((id: string) => id !== targetId);
                        } else if (resolvedType === "channel") {
                            guildConfig.filteredChannels = guildConfig.filteredChannels.filter((id: string) => id !== targetId);
                        } else if (resolvedType === "role") {
                            guildConfig.filteredRoles = guildConfig.filteredRoles.filter((id: string) => id !== targetId);
                        }
                    }
                }

                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);

                // Verileri en güncel haliyle yeniden toplayalım
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

                const channelsList = [];
                for (const id of guildConfig.filteredChannels) {
                    const chan = interaction.guild!.channels.cache.get(id);
                    channelsList.push(chan ? (chan as any).name : `kanal-${id}`);
                }

                const rolesList = [];
                for (const id of guildConfig.filteredRoles) {
                    const role = interaction.guild!.roles.cache.get(id);
                    rolesList.push({
                        name: role ? role.name : `rol-${id}`,
                        color: role ? role.hexColor : "#9b59b6"
                    });
                }

                // Kartı yeniden çiz
                const { CanvasHelper: CanvasRef } = require("../../Global/Utils/CanvasHelper");
                const filterBuffer = await CanvasRef.drawFilterCard({
                    users: usersList,
                    channels: channelsList,
                    roles: rolesList
                });

                const embedHeader = `**İstatistik Filtre Yönetim Paneli**\n\n*Filtre eklemek için:* \`${client.config.Prefix}filter ekle [@kullanici / #kanal / @rol]\`\n*Filtre silmek için:* \`${client.config.Prefix}filter sil [@kullanici / #kanal / @rol]\``;

                const refreshButton = new ButtonBuilder()
                    .setCustomId("filter_refresh")
                    .setLabel("Panel Yenile")
                    .setStyle(ButtonStyle.Secondary);

                const addButton = new ButtonBuilder()
                    .setCustomId("filter_add")
                    .setLabel("Filtre Ekle")
                    .setStyle(ButtonStyle.Success);

                const removeButton = new ButtonBuilder()
                    .setCustomId("filter_remove")
                    .setLabel("Filtre Kaldır")
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(refreshButton, addButton, removeButton);

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

                await interaction.editReply({
                    components: [container],
                    files: [attachment],
                    flags: (Discord as any).MessageFlags.IsComponentsV2
                });
                return;
            }

            if (!interaction.customId.startsWith("modal_setup_")) return;

            await interaction.deferUpdate();
            const guildConfig = await client.getSettings(guildId);
            const modalType = interaction.customId.replace("modal_setup_", "");

            // Twitch & Durum Ayarlarını Kaydet
            if (modalType === "twitch") {
                const twitchUrl = interaction.fields.getTextInputValue("inp_twitch_url").trim();
                const statusText = interaction.fields.getTextInputValue("inp_status_text").trim();

                guildConfig.twitchURL = twitchUrl || "";
                guildConfig.activityName = statusText || "";

                // Durumu güncelle
                client.user.setPresence({
                    activities: [{ name: statusText, type: 3, url: twitchUrl }],
                    status: "online"
                });
            }

            // Çarpanları Kaydet
            else if (modalType === "carpanlar") {
                const keys = ["public", "game", "stream", "staff", "register"];
                for (const key of keys) {
                    const val = parseFloat(interaction.fields.getTextInputValue(`inp_m_${key}`).trim());
                    if (!isNaN(val) && val >= 0) {
                        const cat = guildConfig.voiceCategories.get(key)!;
                        cat.multiplier = val;
                        guildConfig.voiceCategories.set(key, cat);
                    }
                }
            }

            await guildConfig.save();
            client.guildConfigs.set(guildId, guildConfig);

            // Modal tamamlandıktan sonra ana ekrana geri dön ve butonları göster!
            return updateDashboardMessage(client, guildConfig, interaction, [getMainButtonsRow()]);
        }
    }
};
