const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require("discord.js");

module.exports = {
    name: "setup",
    aliases: ["kur", "konfigurasyon", "ayarla"],
    description: "Botun tum dinamik ayarlarini oyun icinden yonetmenizi saglar.",
    usage: "setup [alt_komut] [parametreler]",
    execute: async (client, message, args) => {
        const isDeveloper = client.config.Developers.includes(message.author.id);
        if (!isDeveloper) {
            return message.reply("❌ Bu komutu sadece bot gelistiricileri kullanabilir.");
        }

        const guildId = message.guild.id;
        const guildConfig = await client.getSettings(guildId);

        const sendSetupDashboard = async (customMessage) => {
            const allowedChannelsNames = guildConfig.allowedChannels.map((id) => {
                const ch = message.guild.channels.cache.get(id);
                return ch ? `#${ch.name}` : id;
            });

            const botVoiceChannelName = guildConfig.botVoiceChannelID
                ? (message.guild.channels.cache.get(guildConfig.botVoiceChannelID)?.name || guildConfig.botVoiceChannelID)
                : "Ayarlanmamis";

            const logChannelName = guildConfig.logChannelID
                ? (message.guild.channels.cache.get(guildConfig.logChannelID)?.name || guildConfig.logChannelID)
                : "Ayarlanmamis";

            const staffRolesNames = (guildConfig.staffRoles || []).map((id) => {
                const role = message.guild.roles.cache.get(id);
                return role ? `@${role.name}` : id;
            });

            const categoriesData = [];
            const orderedKeys = ["public", "game", "stream", "staff", "register"];
            for (const key of orderedKeys) {
                const cat = guildConfig.voiceCategories.get(key);
                if (cat) {
                    const resolvedNames = [];
                    for (const id of (cat.channels || [])) {
                        const ch = message.guild.channels.cache.get(id);
                        if (ch) {
                            if (ch.type === ChannelType.GuildCategory) {
                                const subChans = message.guild.channels.cache.filter((c) => c.parentId === ch.id && c.isVoiceBased());
                                subChans.forEach((vc) => resolvedNames.push(vc.name));
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

            let setupBuffer;
            try {
                setupBuffer = await client.canvas.drawSetupCard({
                    allowedChannels: allowedChannelsNames,
                    botVoiceChannel: botVoiceChannelName,
                    logChannel: logChannelName,
                    twitchURL: guildConfig.twitchURL || "Ayarlanmamis",
                    activityName: guildConfig.activityName || "Ayarlanmamis",
                    staffRoles: staffRolesNames,
                    voiceCategories: categoriesData
                });
            } catch (err) {
                console.error("[Setup Command] Canvas cizim hatasi:", err);
                if (customMessage) return customMessage.edit("❌ Kurulum paneli cizilirken hata olustu!").catch(() => {});
                return message.reply("❌ Kurulum paneli cizilirken hata olustu!");
            }

            const attachment = new AttachmentBuilder(setupBuffer, { name: "loki_setup_dashboard.png" });
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("btn_setup_genel").setLabel("Genel Sistem").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("btn_setup_twitch").setLabel("Twitch & Durum").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("btn_setup_kanallar").setLabel("Komut Kanallari").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("btn_setup_carpanlar").setLabel("Kategori Carpanlari").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("btn_setup_odalar").setLabel("Kategori Odalari").setStyle(ButtonStyle.Secondary)
            );

            if (customMessage) await customMessage.delete().catch(() => {});
            return message.reply({ files: [attachment], components: [row] });
        };

        if (!args[0]) {
            const waitMsg = await message.reply("⏳ **Kurulum paneli hazirlaniyor...**");
            await sendSetupDashboard(waitMsg);
            return;
        }

        const subCommand = args[0].toLowerCase();
        const parseChannelId = (input) => {
            if (!input) return "";
            return input.replace(/[<#>]/g, "");
        };

        if (subCommand === "mesajkanal") {
            const action = args[1]?.toLowerCase();
            const channelId = parseChannelId(args[2]);
            if (!action || !channelId || (action !== "ekle" && action !== "sil")) {
                return message.reply(`❌ Yanlis kullanim! Dogru kullanim:\n\`${client.config.Prefix}setup mesajkanal ekle/sil [#kanal]\``);
            }
            const allowed = guildConfig.allowedChannels || [];
            if (action === "ekle") {
                if (allowed.includes(channelId)) return message.reply("❌ Bu kanal zaten komut listesinde ekli.");
                allowed.push(channelId);
                guildConfig.allowedChannels = allowed;
            } else {
                if (!allowed.includes(channelId)) return message.reply("❌ Bu kanal komut listesinde yok.");
                guildConfig.allowedChannels = allowed.filter((id) => id !== channelId);
            }
            await guildConfig.save();
            client.guildConfigs.set(guildId, guildConfig);
            await message.delete().catch(() => {});
            await sendSetupDashboard();
            return;
        }

        if (subCommand === "seskategori") {
            const categoryKey = args[1]?.toLowerCase();
            const action = args[2]?.toLowerCase();
            if (!categoryKey || !guildConfig.voiceCategories.has(categoryKey)) {
                return message.reply(`❌ Gecersiz kategori anahtari! Mevcut anahtarlar: \`public\`, \`game\`, \`stream\`, \`staff\`, \`register\``);
            }
            const category = guildConfig.voiceCategories.get(categoryKey);
            if (action === "ekle" || action === "sil") {
                const channelId = parseChannelId(args[3]);
                if (!channelId) return message.reply(`❌ Lutfen bir ses kanali ID girin!`);
                const channels = category.channels || [];
                if (action === "ekle") {
                    if (channels.includes(channelId)) return message.reply("❌ Bu ses kanali zaten bu kategoride.");
                    channels.push(channelId);
                    category.channels = channels;
                } else {
                    if (!channels.includes(channelId)) return message.reply("❌ Bu ses kanali zaten bu kategoride degil.");
                    category.channels = channels.filter((id) => id !== channelId);
                }
                guildConfig.voiceCategories.set(categoryKey, category);
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);
                await message.delete().catch(() => {});
                await sendSetupDashboard();
                return;
            }
            if (action === "carpan" || action === "multiplier") {
                const multiplierVal = parseFloat(args[3]);
                if (isNaN(multiplierVal) || multiplierVal < 0) return message.reply("❌ Gecerli bir carpan sayisi girin!");
                category.multiplier = multiplierVal;
                guildConfig.voiceCategories.set(categoryKey, category);
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);
                await message.delete().catch(() => {});
                await sendSetupDashboard();
                return;
            }
            if (action === "isim" || action === "name") {
                const newName = args.slice(3).join(" ");
                if (!newName) return message.reply("❌ Lutfen yeni bir isim belirtin!");
                category.name = newName;
                guildConfig.voiceCategories.set(categoryKey, category);
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig);
                await message.delete().catch(() => {});
                await sendSetupDashboard();
                return;
            }
            return message.reply(`❌ Gecersiz islem! \`ekle\`, \`sil\`, \`carpan\` veya \`isim\` parametrelerini kullanin.`);
        }

        if (subCommand === "botkanal" || subCommand === "botses") {
            const channelId = parseChannelId(args[1]);
            if (!channelId) return message.reply(`❌ Gecerli bir ses kanali ID girin!`);
            guildConfig.botVoiceChannelID = channelId;
            await guildConfig.save();
            client.guildConfigs.set(guildId, guildConfig);
            await message.delete().catch(() => {});
            await sendSetupDashboard();
            return;
        }

        if (subCommand === "logkanal") {
            const channelId = parseChannelId(args[1]);
            if (!channelId) return message.reply(`❌ Gecerli bir log kanali girin!`);
            guildConfig.logChannelID = channelId;
            await guildConfig.save();
            client.guildConfigs.set(guildId, guildConfig);
            await message.delete().catch(() => {});
            await sendSetupDashboard();
            return;
        }

        if (subCommand === "twitch" || subCommand === "twitchurl") {
            const twitchUrl = args[1];
            if (!twitchUrl || !twitchUrl.startsWith("http")) {
                return message.reply("❌ Gecerli bir URL girin! (Ornek: https://twitch.tv/loki)");
            }
            guildConfig.twitchURL = twitchUrl;
            await guildConfig.save();
            client.guildConfigs.set(guildId, guildConfig);
            await message.delete().catch(() => {});
            await sendSetupDashboard();
            return;
        }

        if (subCommand === "durum" || subCommand === "activity") {
            const activityText = args.slice(1).join(" ");
            if (!activityText) return message.reply("❌ Durum yazisini yazin!");
            guildConfig.activityName = activityText;
            await guildConfig.save();
            client.guildConfigs.set(guildId, guildConfig);
            client.user.setPresence({
                activities: [{ name: activityText, type: 3, url: guildConfig.twitchURL }],
                status: "online"
            });
            await message.delete().catch(() => {});
            await sendSetupDashboard();
            return;
        }

        if (subCommand === "yetkilirol" || subCommand === "yetkili" || subCommand === "staffrole" || subCommand === "staffroles") {
            const action = args[1]?.toLowerCase();
            const roleId = args[2] ? args[2].replace(/[<@&>]/g, "") : "";
            if (!action || !roleId || (action !== "ekle" && action !== "sil")) {
                return message.reply(`❌ Yanlis kullanim! Dogru kullanim:\n\`${client.config.Prefix}setup yetkilirol ekle/sil [@rol]\``);
            }
            const roles = guildConfig.staffRoles || [];
            if (action === "ekle") {
                if (roles.includes(roleId)) return message.reply("❌ Bu rol zaten yetkili listesinde.");
                roles.push(roleId);
                guildConfig.staffRoles = roles;
            } else {
                if (!roles.includes(roleId)) return message.reply("❌ Bu rol yetkili listesinde degil.");
                guildConfig.staffRoles = roles.filter((id) => id !== roleId);
            }
            await guildConfig.save();
            client.guildConfigs.set(guildId, guildConfig);
            await message.delete().catch(() => {});
            await sendSetupDashboard();
            return;
        }

        return message.reply(`❌ Bilinmeyen alt komut! Kilavuzu gormek icin sadece \`${client.config.Prefix}setup\` yazin.`);
    }
};
