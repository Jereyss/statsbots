const Discord = require("discord.js");
const { AttachmentBuilder } = require("discord.js");
const { CanvasHelper } = require("../../../Global/Utils/CanvasHelper");

module.exports = {
    name: "help",
    aliases: ["yardim", "yardım", "komutlar", "kilavuz", "bilgi"],
    description: "Botun tum komutlarini kategoriler halinde listeler.",
    usage: "yardim",
    execute: async (client, message, args) => {
        const waitMsg = await message.reply("⏳ **Gorsel Yardim Paneli hazirlaniyor, lutfen bekleyin...**");

        try {
            const helpBuffer = await CanvasHelper.drawHelpCard({ category: "home" });

            const embedHeader = `**Loki Istatistik ve Yonetim Sistemi Kilavuzu**\n\n*Asagidaki butonlari kullanarak sekmeler arasinda dinamik olarak gecis yapabilirsiniz.*`;

            const homeButton = new Discord.ButtonBuilder()
                .setCustomId("help_home")
                .setLabel("Ana Sayfa")
                .setStyle(Discord.ButtonStyle.Secondary);

            const rootButton = new Discord.ButtonBuilder()
                .setCustomId("help_root")
                .setLabel("Yonetim Komutlari")
                .setStyle(Discord.ButtonStyle.Secondary);

            const statsButton = new Discord.ButtonBuilder()
                .setCustomId("help_stats")
                .setLabel("Istatistik Komutlari")
                .setStyle(Discord.ButtonStyle.Secondary);

            const row = new Discord.ActionRowBuilder().addComponents(homeButton, rootButton, statsButton);

            const gallery = new Discord.MediaGalleryBuilder()
                .addItems(
                    new Discord.MediaGalleryItemBuilder().setURL("attachment://loki_help_panel.png")
                );

            const container = new Discord.ContainerBuilder()
                .addMediaGalleryComponents(gallery)
                .addSeparatorComponents(new Discord.SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new Discord.TextDisplayBuilder().setContent(embedHeader))
                .addSeparatorComponents(new Discord.SeparatorBuilder().setDivider(true))
                .addActionRowComponents(row);

            const attachment = new AttachmentBuilder(helpBuffer, { name: "loki_help_panel.png" });

            await waitMsg.delete().catch(() => {});
            await message.reply({
                components: [container],
                files: [attachment],
                flags: Discord.MessageFlags.IsComponentsV2
            });
        } catch (err) {
            console.error("[Help Command] Yardim paneli olusturulurken hata:", err);
            await waitMsg.edit("❌ Yardim paneli yuklenirken teknik bir hata olustu!").catch(() => {});
        }
    }
};
