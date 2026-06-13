require("dotenv").config();

const BotSettings = {
    Token: process.env.DISCORD_TOKEN || "",
    DatabaseURL: process.env.DATABASE_URL || "",
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

module.exports = { BotSettings };
