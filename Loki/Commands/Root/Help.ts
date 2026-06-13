import * as Discord from "discord.js";
import { Message, AttachmentBuilder } from "discord.js";
import { CanvasHelper } from "../../../Global/Utils/CanvasHelper";

export default {
    name: "help",
    aliases: ["yardim", "yardım", "komutlar", "kılavuz", "bilgi"],
    description: "Botun tüm komutlarını kategoriler halinde listeler ve kullanım kılavuzunu gösterir.",
    usage: "yardım",
    execute: async (client: any, message: Message, args: string[]) => {
        const waitMsg = await message.reply("⏳ **Görsel Yardım Paneli hazırlanıyor, lütfen bekleyin...**");

        try {
            // Başlangıç olarak Ana Sayfa (home) kartını çizelim
            const helpBuffer = await CanvasHelper.drawHelpCard({
                category: "home"
            });

            const embedHeader = `**Loki İstatistik ve Yönetim Sistemi Kılavuzu**\n\n*Aşağıdaki butonları kullanarak sekmeler arasında dinamik olarak geçiş yapabilir, komut detaylarına ve kullanımlarına ulaşabilirsiniz.*`;

            // Butonları Tanımlayalım (Design Uyumluluğu İçin Secondary Gri Stil)
            const homeButton = new Discord.ButtonBuilder()
                .setCustomId("help_home")
                .setLabel("Ana Sayfa")
                .setStyle(Discord.ButtonStyle.Secondary);

            const rootButton = new Discord.ButtonBuilder()
                .setCustomId("help_root")
                .setLabel("Yönetim Komutları")
                .setStyle(Discord.ButtonStyle.Secondary);

            const statsButton = new Discord.ButtonBuilder()
                .setCustomId("help_stats")
                .setLabel("İstatistik Komutları")
                .setStyle(Discord.ButtonStyle.Secondary);

            const row = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
                .addComponents(homeButton, rootButton, statsButton);

            // Görseli yeni nesil MediaGallery bileşeni olarak Container'a gömüyoruz
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

            await waitMsg.delete().catch(() => { });

            // Tek mesajda, en üstte görsel + altta panel olarak gönder
            await message.reply({
                components: [container],
                files: [attachment],
                flags: Discord.MessageFlags.IsComponentsV2
            });

        } catch (err) {
            console.error("[Help Command] Yardım paneli oluşturulurken hata:", err);
            await waitMsg.edit("❌ Yardım paneli yüklenirken teknik bir hata oluştu!").catch(() => { });
        }
    }
};
