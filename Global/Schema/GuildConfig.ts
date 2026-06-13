import { Schema, model, Document } from "mongoose";

export interface IVoiceCategoryConfig {
    name: string;
    channels: string[];
    multiplier: number;
}

export interface IGuildConfig extends Document {
    guildID: string;
    allowedChannels: string[];       // Bot komutlarının çalışabileceği mesaj kanalları
    botVoiceChannelID: string;     // Botun otomatik bağlanacağı ses kanalı
    twitchURL: string;             // Mor simge için Twitch yayın adresi
    activityName: string;          // Yayında görünecek durum başlığı
    logChannelID: string;          // Sıfırlama loglarının atılacağı kanal
    voiceCategories: Map<string, IVoiceCategoryConfig>; // Ses kategorileri ve çarpanları
    filteredUsers: string[];       // İstatistiklerden filtrelenecek kullanıcılar
    filteredChannels: string[];    // İstatistiklerden filtrelenecek kanallar
    filteredRoles: string[];       // İstatistiklerden filtrelenecek roller
    staffRoles: string[];          // Sunucu yetkili rolleri
}

const GuildConfigSchema = new Schema<IGuildConfig>({
    guildID: { type: String, required: true, unique: true },
    allowedChannels: { type: [String], default: [] },
    botVoiceChannelID: { type: String, default: "" },
    twitchURL: { type: String, default: "https://twitch.tv/loki" },
    activityName: { type: String, default: "Loki İstatistik Sistemi" },
    logChannelID: { type: String, default: "" },
    filteredUsers: { type: [String], default: [] },
    filteredChannels: { type: [String], default: [] },
    filteredRoles: { type: [String], default: [] },
    staffRoles: { type: [String], default: [] },
    voiceCategories: {
        type: Map,
        of: {
            name: { type: String, required: true },
            channels: { type: [String], default: [] },
            multiplier: { type: Number, default: 1.0 }
        },
        default: () => new Map([
            ["public", { name: "Public Ses", channels: [], multiplier: 2.0 }],
            ["game", { name: "Oyun Ses", channels: [], multiplier: 1.5 }],
            ["stream", { name: "Yayın Ses", channels: [], multiplier: 2.5 }],
            ["staff", { name: "Yetkili Ses", channels: [], multiplier: 3.0 }],
            ["register", { name: "Kayıt Ses", channels: [], multiplier: 1.0 }]
        ])
    }
});

export default model<IGuildConfig>("GuildConfig", GuildConfigSchema);
