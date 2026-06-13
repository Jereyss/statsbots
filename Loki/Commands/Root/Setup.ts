import { Message, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from "discord.js";

export default {
    name: "setup",
    aliases: ["kur", "konfigurasyon", "ayarla"],
    description: "Botun tüm dinamik ayarlarını oyun içinden yönetmenizi sağlar.",
    usage: "setup [alt_komut] [parametreler]",
    execute: async (client: any, message: Message, args: string[]) => {
        // Sadece yetkili geliştiriciler kullanabilir (client.config üzerinden)
        const isDeveloper = client.config.Developers.includes(message.author.id);
        if (!isDeveloper) {
            return message.reply("❌ Bu komutu sadece bot geliştiricileri kullanabilir.");
        }

        const guildId = message.guild!.id;
        
        // Sunucu ayarlarını çek
        const guildConfig = await client.getSettings(guildId);

        // --- DASHBOARD GÖNDERME/ÇİZME YARDIMCI FONKSİYONU ---
        const sendSetupDashboard = async (customMessage?: Message) => {
            // Kanalların isimlerini çözümleyelim
            const allowedChannelsNames = guildConfig.allowedChannels.map((id: string) => {
                const ch = message.guild!.channels.cache.get(id);
                return ch ? `#${ch.name}` : id;
            });

            const botVoiceChannelName = guildConfig.botVoiceChannelID
                ? (message.guild!.channels.cache.get(guildConfig.botVoiceChannelID)?.name || guildConfig.botVoiceChannelID)
                : "Ayarlanmamış";

            const logChannelName = guildConfig.logChannelID
                ? (message.guild!.channels.cache.get(guildConfig.logChannelID)?.name || guildConfig.logChannelID)
                : "Ayarlanmamış";

            const staffRolesNames = (guildConfig.staffRoles || []).map((id: string) => {
                const role = message.guild!.roles.cache.get(id);
                return role ? `@${role.name}` : id;
            });

            // Ses Kategorilerini derleyelim (Düzgün Sıralı & Çözümlenmiş Gerçek Ses Odalarıyla)
            const categoriesData: any[] = [];
            const orderedKeys = ["public", "game", "stream", "staff", "register"];
            for (const key of orderedKeys) {
                const cat = guildConfig.voiceCategories.get(key);
                if (cat) {
                    const resolvedNames: string[] = [];
                    for (const id of (cat.channels || [])) {
                        const ch = message.guild!.channels.cache.get(id);
                        if (ch) {
                            if (ch.type === ChannelType.GuildCategory) {
                                // Bu bir kategori ise altındaki ses odalarını bulalım
                                const subChans = message.guild!.channels.cache.filter((c: any) => c.parentId === ch.id && c.isVoiceBased());
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

            // Görsel Dashboard Çiz (client.canvas konteyneri üzerinden)
            let setupBuffer: Buffer;
            try {
                setupBuffer = await client.canvas.drawSetupCard({
                    allowedChannels: allowedChannelsNames,
                    botVoiceChannel: botVoiceChannelName,
                    logChannel: logChannelName,
                    twitchURL: guildConfig.twitchURL || "Ayarlanmamış",
                    activityName: guildConfig.activityName || "Ayarlanmamış",
                    staffRoles: staffRolesNames,
                    voiceCategories: categoriesData
                });
            } catch (err) {
                console.error("[Setup Command] Canvas çizim hatası:", err);
                if (customMessage) {
                    return customMessage.edit("❌ Kurulum gösterge paneli çizilirken grafiksel bir hata oluştu!").catch(() => {});
                }
                return message.reply("❌ Kurulum gösterge paneli çizilirken grafiksel bir hata oluştu!");
            }

            const attachment = new AttachmentBuilder(setupBuffer, { name: "loki_setup_dashboard.png" });

            // 5 Adet Tasarıma Uyumlu Gri Buton (ButtonStyle.Secondary)
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("btn_setup_genel")
                    .setLabel("Genel Sistem")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("btn_setup_twitch")
                    .setLabel("Twitch & Durum")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("btn_setup_kanallar")
                    .setLabel("Komut Kanalları")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("btn_setup_carpanlar")
                    .setLabel("Kategori Çarpanları")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("btn_setup_odalar")
                    .setLabel("Kategori Odaları")
                    .setStyle(ButtonStyle.Secondary)
            );

            if (customMessage) {
                await customMessage.delete().catch(() => {});
            }

            return message.reply({
                files: [attachment],
                components: [row]
            });
        };

        // --- ALT KOMUT YOKSA: MEVCUT AYARLARI GÖSTER & KILAVUZ SUN ---
        if (!args[0]) {
            const waitMsg = await message.reply("⏳ **Kurulum paneli göstergesi hazırlanıyor, lütfen bekleyin...**");
            await sendSetupDashboard(waitMsg);
            return;
        }

        const subCommand = args[0].toLowerCase();

        // Helper: Kanalları regex ile ayıkla (Etiket veya Düz ID destekler)
        const parseChannelId = (input: string): string => {
            if (!input) return "";
            return input.replace(/[<#>]/g, "");
        };

        // --- ALT KOMUT 1: mesajkanal ---
        if (subCommand === "mesajkanal") {
            const action = args[1]?.toLowerCase();
            const channelRaw = args[2];
            const channelId = parseChannelId(channelRaw);

            if (!action || !channelId || (action !== "ekle" && action !== "sil")) {
                return message.reply(`❌ Yanlış kullanım! Doğru kullanım:\n\`${client.config.Prefix}setup mesajkanal ekle/sil [#kanal]\``);
            }

            const allowed = guildConfig.allowedChannels || [];

            if (action === "ekle") {
                if (allowed.includes(channelId)) return message.reply("❌ Bu kanal zaten komut listesinde ekli.");
                allowed.push(channelId);
                guildConfig.allowedChannels = allowed;
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig); // Cache Tazele
                
                await message.delete().catch(() => {});
                await sendSetupDashboard();
                return;
            } else {
                if (!allowed.includes(channelId)) return message.reply("❌ Bu kanal zaten komut listesinde yok.");
                guildConfig.allowedChannels = allowed.filter((id: string) => id !== channelId);
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig); // Cache Tazele
                
                await message.delete().catch(() => {});
                await sendSetupDashboard();
                return;
            }
        }

        // --- ALT KOMUT 2: seskategori ---
        if (subCommand === "seskategori") {
            const categoryKey = args[1]?.toLowerCase();
            const action = args[2]?.toLowerCase();
            
            if (!categoryKey || !guildConfig.voiceCategories.has(categoryKey)) {
                return message.reply(`❌ Geçersiz kategori anahtarı! Mevcut anahtarlar: \`public\`, \`game\`, \`stream\`, \`staff\`, \`register\``);
            }

            const category = guildConfig.voiceCategories.get(categoryKey)!;

            // Kategoriye Kanal Ekle / Çıkar
            if (action === "ekle" || action === "sil") {
                const channelId = parseChannelId(args[3]);
                if (!channelId) {
                    return message.reply(`❌ Lütfen bir ses kanalı etiketleyin veya ID girin!\nÖrn: \`${client.config.Prefix}setup seskategori ${categoryKey} ekle [kanal_id]\``);
                }

                const channels = category.channels || [];

                if (action === "ekle") {
                    if (channels.includes(channelId)) return message.reply("❌ Bu ses kanalı zaten bu kategoride ekli.");
                    channels.push(channelId);
                    category.channels = channels;
                } else {
                    if (!channels.includes(channelId)) return message.reply("❌ Bu ses kanalı zaten bu kategoride değil.");
                    category.channels = channels.filter((id: string) => id !== channelId);
                }

                guildConfig.voiceCategories.set(categoryKey, category);
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig); // Cache Tazele
                
                await message.delete().catch(() => {});
                await sendSetupDashboard();
                return;
            }

            // Çarpanı Ayarla
            if (action === "çarpan" || action === "carpan" || action === "multiplier") {
                const multiplierVal = parseFloat(args[3]);
                if (isNaN(multiplierVal) || multiplierVal < 0) {
                    return message.reply("❌ Lütfen geçerli pozitif bir çarpan sayısı girin! (Örn: 2.5)");
                }

                category.multiplier = multiplierVal;
                guildConfig.voiceCategories.set(categoryKey, category);
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig); // Cache Tazele
                
                await message.delete().catch(() => {});
                await sendSetupDashboard();
                return;
            }

            // İsmini Değiştir
            if (action === "isim" || action === "name") {
                const newName = args.slice(3).join(" ");
                if (!newName) return message.reply("❌ Lütfen kategori için yeni bir isim belirtin!");

                category.name = newName;
                guildConfig.voiceCategories.set(categoryKey, category);
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig); // Cache Tazele
                
                await message.delete().catch(() => {});
                await sendSetupDashboard();
                return;
            }

            return message.reply(`❌ Geçersiz işlem! Ses kategorisini yönetmek için \`ekle\`, \`sil\`, \`çarpan\` veya \`isim\` parametrelerini kullanın.`);
        }

        // --- ALT KOMUT 3: botkanal ---
        if (subCommand === "botkanal" || subCommand === "botses") {
            const channelId = parseChannelId(args[1]);
            if (!channelId) {
                return message.reply(`❌ Lütfen geçerli bir ses kanalı ID'si girin!`);
            }

            guildConfig.botVoiceChannelID = channelId;
            await guildConfig.save();
            client.guildConfigs.set(guildId, guildConfig); // Cache Tazele
            
            await message.delete().catch(() => {});
            await sendSetupDashboard();
            return;
        }

        // --- ALT KOMUT 4: logkanal ---
        if (subCommand === "logkanal") {
            const channelId = parseChannelId(args[1]);
            if (!channelId) {
                return message.reply(`❌ Lütfen geçerli bir log kanalı etiketleyin veya ID girin!`);
            }

            guildConfig.logChannelID = channelId;
            await guildConfig.save();
            client.guildConfigs.set(guildId, guildConfig); // Cache Tazele
            
            await message.delete().catch(() => {});
            await sendSetupDashboard();
            return;
        }

        // --- ALT KOMUT 5: twitch ---
        if (subCommand === "twitch" || subCommand === "twitchurl") {
            const twitchUrl = args[1];
            if (!twitchUrl || !twitchUrl.startsWith("http")) {
                return message.reply("❌ Lütfen geçerli bir url adresi girin! (Örn: https://twitch.tv/loki)");
            }

            guildConfig.twitchURL = twitchUrl;
            await guildConfig.save();
            client.guildConfigs.set(guildId, guildConfig); // Cache Tazele
            
            await message.delete().catch(() => {});
            await sendSetupDashboard();
            return;
        }

        // --- ALT KOMUT 6: durum ---
        if (subCommand === "durum" || subCommand === "activity") {
            const activityText = args.slice(1).join(" ");
            if (!activityText) {
                return message.reply("❌ Lütfen durumda görünecek durum yazısını yazın!");
            }

            guildConfig.activityName = activityText;
            await guildConfig.save();
            client.guildConfigs.set(guildId, guildConfig); // Cache Tazele
            
            // Botun durumunu anlık olarak hemen güncelle!
            client.user.setPresence({
                activities: [{ name: activityText, type: 3, url: guildConfig.twitchURL }],
                status: "online"
            });

            await message.delete().catch(() => {});
            await sendSetupDashboard();
            return;
        }

        // --- ALT KOMUT 7: yetkilirol ---
        if (subCommand === "yetkilirol" || subCommand === "yetkili" || subCommand === "staffrole" || subCommand === "staffroles") {
            const action = args[1]?.toLowerCase();
            const roleRaw = args[2];
            const roleId = roleRaw ? roleRaw.replace(/[<@&>]/g, "") : "";

            if (!action || !roleId || (action !== "ekle" && action !== "sil")) {
                return message.reply(`❌ Yanlış kullanım! Doğru kullanım:\n\`${client.config.Prefix}setup yetkilirol ekle/sil [@rol]\``);
            }

            const roles = guildConfig.staffRoles || [];

            if (action === "ekle") {
                if (roles.includes(roleId)) return message.reply("❌ Bu rol zaten yetkili listesinde ekli.");
                roles.push(roleId);
                guildConfig.staffRoles = roles;
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig); // Cache Tazele
                
                await message.delete().catch(() => {});
                await sendSetupDashboard();
                return;
            } else {
                if (!roles.includes(roleId)) return message.reply("❌ Bu rol zaten yetkili listesinde değil.");
                guildConfig.staffRoles = roles.filter((id: string) => id !== roleId);
                await guildConfig.save();
                client.guildConfigs.set(guildId, guildConfig); // Cache Tazele
                
                await message.delete().catch(() => {});
                await sendSetupDashboard();
                return;
            }
        }

        return message.reply(`❌ Bilinmeyen alt komut! Kılavuzu görmek için sadece \`${client.config.Prefix}setup\` yazın.`);
    }
};
