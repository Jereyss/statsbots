import { 
    Message, 
    PermissionFlagsBits, 
    AttachmentBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ComponentType
} from "discord.js";
import { CanvasHelper } from "../../../Global/Utils/CanvasHelper";

export default {
    name: "bonusinvite",
    aliases: ["davetekle", "davetsil", "davet-ekle", "davet-sil", "bonusdavet"],
    description: "Belirtilen üyeye butonlu kontrol paneli ile veya doğrudan bonus davet ekler/siler.",
    usage: "bonusinvite [@kullanici]",
    execute: async (client: any, message: Message, args: string[]) => {
        const isDeveloper = client.config.Developers.includes(message.author.id);
        const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
        if (!isDeveloper && !isAdmin) {
            return message.reply("❌ Bu komutu kullanabilmek için **Yönetici** yetkisine sahip olmalısınız!");
        }

        // Akıllı Argüman Eşlemesi
        const cmdName = message.content.split(" ")[0].slice(client.config.Prefix.length).toLowerCase();
        let targetArg = "";
        let directAction = "";
        let directAmount = 0;

        if (cmdName === "davetekle" || cmdName === "davet-ekle") {
            directAction = "ekle";
            targetArg = args[0];
            directAmount = parseInt(args[1]);
        } else if (cmdName === "davetsil" || cmdName === "davet-sil") {
            directAction = "sil";
            targetArg = args[0];
            directAmount = parseInt(args[1]);
        } else {
            // !bonusinvite ekle/sil [@kullanici] [sayi] biçimi kontrolü
            const possibleAction = args[0]?.toLowerCase();
            if (possibleAction === "ekle" || possibleAction === "sil") {
                directAction = possibleAction;
                targetArg = args[1];
                directAmount = parseInt(args[2]);
            } else {
                targetArg = args[0];
            }
        }

        let targetMember = message.mentions.members?.first();
        if (!targetMember && targetArg) {
            targetMember = await message.guild?.members.fetch(targetArg).catch(() => undefined);
        }

        if (!targetMember) {
            targetMember = message.member!;
        }

        const guildId = message.guild!.id;

        // 1. Veritabanından Kullanıcının İstatistik Dökümanını Bul/Yarat
        let statDoc = await client.db.findOne({ guildID: guildId, userID: targetMember.user.id });
        if (!statDoc) {
            statDoc = new client.db({
                guildID: guildId,
                userID: targetMember.user.id,
                voiceActive: { daily: 0, weekly: 0, monthly: 0, total: 0 },
                messageActive: { daily: 0, weekly: 0, monthly: 0, total: 0 },
                voiceChannels: new Map(),
                voiceCategories: new Map(),
                messageChannels: new Map(),
                hourlyVoice: Array(24).fill(0),
                dailyHistory: []
            });
        }

        if (!statDoc.inviteStats) {
            statDoc.inviteStats = { regular: 0, fake: 0, left: 0, bonus: 0, total: 0 };
        }

        // --- DOĞRUDAN CLI İŞLEMİ (Eğer bir sayı ve aksiyon varsa) ---
        if (directAction && !isNaN(directAmount) && directAmount > 0) {
            if (directAction === "ekle") {
                statDoc.inviteStats.bonus += directAmount;
            } else {
                if (statDoc.inviteStats.bonus < directAmount) {
                    return message.reply(`❌ Belirtilen üyenin mevcut bonus davet puanı (**${statDoc.inviteStats.bonus}**), silinmek istenen sayıdan (**${directAmount}**) daha düşük!`);
                }
                statDoc.inviteStats.bonus -= directAmount;
            }
            statDoc.inviteStats.total = (statDoc.inviteStats.regular || 0) + statDoc.inviteStats.bonus - (statDoc.inviteStats.left || 0);
            await statDoc.save();

            // Güncel Canvas'ı çizdir
            const canvasBuffer = await CanvasHelper.drawBonusInviteCard({
                displayName: targetMember.displayName,
                tag: targetMember.user.tag,
                avatarUrl: targetMember.user.displayAvatarURL({ extension: "png", size: 256 }),
                inviteStats: statDoc.inviteStats
            });

            const attachment = new AttachmentBuilder(canvasBuffer, { name: "bonus-invite.png" });
            return message.reply({
                content: `✅ **${targetMember.displayName}** adlı üyenin bonus davet puanı **${directAmount}** adet ${directAction === "ekle" ? "arttırıldı" : "azaltıldı"}! Yeni Bonus Davet Puanı: **${statDoc.inviteStats.bonus}**.`,
                files: [attachment]
            });
        }

        // --- ETKİLEŞİMLİ CANVAS & BUTON PANELİ ---
        const buildButtons = (disabled = false) => {
            return new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("btn_bonus_add_1")
                    .setLabel("+1 Ekle")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId("btn_bonus_add_5")
                    .setLabel("+5 Ekle")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId("btn_bonus_remove_1")
                    .setLabel("-1 Sil")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId("btn_bonus_remove_5")
                    .setLabel("-5 Sil")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId("btn_bonus_reset")
                    .setLabel("Sıfırla")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled)
            );
        };

        const renderAndSend = async () => {
            const canvasBuffer = await CanvasHelper.drawBonusInviteCard({
                displayName: targetMember.displayName,
                tag: targetMember.user.tag,
                avatarUrl: targetMember.user.displayAvatarURL({ extension: "png", size: 256 }),
                inviteStats: statDoc.inviteStats
            });
            return new AttachmentBuilder(canvasBuffer, { name: "bonus-invite.png" });
        };

        let initialAttachment = await renderAndSend();
        const mainMessage = await message.reply({
            content: `**${targetMember.displayName}** adlı üyenin bonus davet puanını yönetmek için aşağıdaki butonları kullanabilirsiniz:`,
            files: [initialAttachment],
            components: [buildButtons(false)]
        });

        // 5 Dakikalık Buton Toplayıcı (Collector)
        const collector = mainMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000 
        });

        collector.on("collect", async (interaction) => {
            // Butona sadece yetkililer tıklayabilir
            const isClickerDev = client.config.Developers.includes(interaction.user.id);
            const isClickerAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
            if (!isClickerDev && !isClickerAdmin) {
                return interaction.reply({ content: "❌ Bu paneli yönetmek için **Yönetici** yetkisine sahip olmalısınız!", ephemeral: true });
            }

            await interaction.deferUpdate();

            // İşlemi Gerçekleştir
            switch (interaction.customId) {
                case "btn_bonus_add_1":
                    statDoc.inviteStats.bonus += 1;
                    break;
                case "btn_bonus_add_5":
                    statDoc.inviteStats.bonus += 5;
                    break;
                case "btn_bonus_remove_1":
                    if (statDoc.inviteStats.bonus >= 1) {
                        statDoc.inviteStats.bonus -= 1;
                    }
                    break;
                case "btn_bonus_remove_5":
                    if (statDoc.inviteStats.bonus >= 5) {
                        statDoc.inviteStats.bonus -= 5;
                    } else {
                        statDoc.inviteStats.bonus = 0;
                    }
                    break;
                case "btn_bonus_reset":
                    statDoc.inviteStats.bonus = 0;
                    break;
            }

            statDoc.inviteStats.total = (statDoc.inviteStats.regular || 0) + statDoc.inviteStats.bonus - (statDoc.inviteStats.left || 0);
            await statDoc.save();

            // Yeniden çizip mesajı güncelle
            const newAttachment = await renderAndSend();
            await mainMessage.edit({
                files: [newAttachment],
                components: [buildButtons(false)]
            });
        });

        collector.on("end", async () => {
            // Süre dolduğunda butonları devre dışı bırak
            await mainMessage.edit({
                components: [buildButtons(true)]
            }).catch(() => undefined);
        });
    }
};
