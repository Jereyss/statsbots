export interface BotSettingsInterface {
    Token: string;               // Discord Bot Token
    MongoURI: string;            // MongoDB Bağlantı Adresi (URI)
    Prefix: string;              // Komut Ön Eki (Prefix)
    Developers: string[];        // Bot sahibinin/geliştiricilerin Discord ID'leri
    GuildID: string;             // Ana sunucunun Discord ID'si
    MessageMultiplier: number;   // Mesaj başına puan çarpanı
    CanvasColors: {
        primary: string;         // Neon Turkuaz
        secondary: string;       // Neon Mor
        background: string;      // Kart Arka Plan
        cardBg: string;          // Buzlu Cam Panel Arka Plan
        textColor: string;       // Ana Beyaz Yazı
        subTextColor: string;    // Detay Gri Yazı
        glowColor: string;       // Grafik Parlama Rengi
    };
}

export const BotSettings: BotSettingsInterface = {
    Token: "",
    MongoURI: "",
    Prefix: ".",
    Developers: ["770067487097749534"], // Bot sahibi veya yetkili geliştirici ID'leri
    GuildID: "1514703263688036553",
    MessageMultiplier: 15,
    CanvasColors: {
        primary: "#00f2fe",
        secondary: "#7f00ff",
        background: "#0d0e12",
        cardBg: "rgba(22, 23, 29, 0.7)",
        textColor: "#ffffff",
        subTextColor: "#a0a5b5",
        glowColor: "rgba(0, 242, 254, 0.45)"
    }
};
