import * as dotenv from "dotenv";
dotenv.config();

export interface BotSettingsInterface {
    Token: string;
    MongoURI: string;
    Prefix: string;
    Developers: string[];
    GuildID: string;
    MessageMultiplier: number;
    CanvasColors: {
        primary: string;
        secondary: string;
        background: string;
        cardBg: string;
        textColor: string;
        subTextColor: string;
        glowColor: string;
    };
}

export const BotSettings: BotSettingsInterface = {
    Token: process.env.DISCORD_TOKEN || "",
    MongoURI: process.env.MONGODB_URI || "",
    Prefix: process.env.BOT_PREFIX || ".",
    Developers: ["770067487097749534"],
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
