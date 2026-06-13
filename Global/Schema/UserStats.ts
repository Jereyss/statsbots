import { Schema, model, Document } from "mongoose";

export interface IDailyHistory {
    date: string;     // YYYY-MM-DD formatında tarih
    voice: number;    // O gün ses kanalında geçirilen saniye
    messages: number; // O gün atılan mesaj sayısı
}

export interface IUserStats extends Document {
    guildID: string;
    userID: string;
    voiceActive: {
        daily: number;   // Günlük ses süresi (Saniye)
        weekly: number;  // Haftalık ses süresi (Saniye)
        monthly: number; // Aylık ses süresi (Saniye)
        total: number;   // Toplam ses süresi (Saniye)
    };
    voiceChannels: Map<string, number>;    // Kanal ID -> Süre (Saniye)
    voiceCategories: Map<string, number>;  // Kategori Adı -> Süre (Saniye)
    messageActive: {
        daily: number;   // Günlük mesaj sayısı
        weekly: number;  // Haftalık mesaj sayısı
        monthly: number; // Aylık mesaj sayısı
        total: number;   // Toplam mesaj sayısı
    };
    messageChannels: Map<string, number>;  // Kanal ID -> Mesaj Sayısı
    hourlyVoice: number[];  // 24 elemanlı dizi (Her saat diliminde kaç saniye seste kalındı)
    dailyHistory: IDailyHistory[]; // Çizgi grafik için son 7 günün aktiflik geçmişi
    inviterID?: string; // Bu üyeyi davet eden kişinin ID'si
    inviteStats: {
        regular: number; // Gerçek/Normal Davetler
        fake: number;    // Sahte/Yeni Hesap Davetleri
        left: number;    // Sunucudan Ayrılan Davetler
        bonus: number;   // Yönetici Tarafından Eklenen Bonus Davetler
        total: number;   // Toplam Net Davetler
    };
}

const UserStatsSchema = new Schema<IUserStats>({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    voiceActive: {
        daily: { type: Number, default: 0 },
        weekly: { type: Number, default: 0 },
        monthly: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    voiceChannels: { type: Map, of: Number, default: new Map() },
    voiceCategories: { type: Map, of: Number, default: new Map() },
    messageActive: {
        daily: { type: Number, default: 0 },
        weekly: { type: Number, default: 0 },
        monthly: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    messageChannels: { type: Map, of: Number, default: new Map() },
    hourlyVoice: { type: [Number], default: () => Array(24).fill(0) },
    dailyHistory: {
        type: [{
            date: { type: String, required: true },
            voice: { type: Number, default: 0 },
            messages: { type: Number, default: 0 }
        }],
        default: []
    },
    inviterID: { type: String, default: "" },
    inviteStats: {
        regular: { type: Number, default: 0 },
        fake: { type: Number, default: 0 },
        left: { type: Number, default: 0 },
        bonus: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    }
});

// Hızlı arama ve benzersizlik için birleşik indeks tanımlıyoruz
UserStatsSchema.index({ guildID: 1, userID: 1 }, { unique: true });

export default model<IUserStats>("UserStats", UserStatsSchema);
