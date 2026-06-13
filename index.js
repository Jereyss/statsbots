const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { BotSettings } = require("./Global/BotSettings");
const GuildConfigDB = require("./Global/Database/GuildConfigDB");
const UserStatsDB = require("./Global/Database/UserStatsDB");
const { CanvasHelper } = require("./Global/Utils/CanvasHelper");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.User]
});

client.commands = new Collection();
client.voiceSessions = new Map();
client.guildConfigs = new Map();

client.db = UserStatsDB;
client.guildConfigDb = GuildConfigDB;
client.config = BotSettings;
client.canvas = CanvasHelper;

let emojisCached = {};
try {
    const emojiPath = path.join(__dirname, "Global", "emoji.json");
    const emojilerPath = path.join(__dirname, "Global", "emojiler.json");
    const file1 = fs.existsSync(emojiPath) ? JSON.parse(fs.readFileSync(emojiPath, "utf-8")) : {};
    const file2 = fs.existsSync(emojilerPath) ? JSON.parse(fs.readFileSync(emojilerPath, "utf-8")) : {};
    emojisCached = { ...file1, ...file2 };
} catch (err) {
    console.error("[Container Hata] Emojiler onbellege yuklenemedi:", err);
}

client.emoji = (name) => {
    return emojisCached[name] || "";
};

client.getSettings = async (guildId) => {
    let cfg = client.guildConfigs.get(guildId);
    if (!cfg) {
        cfg = await client.guildConfigDb.findOne({ guildID: guildId });
        if (!cfg) {
            cfg = new client.guildConfigDb({ guildID: guildId });
            await cfg.save();
        }
        client.guildConfigs.set(guildId, cfg);
    }
    return cfg;
};

console.log("[Sistem] Komutlar yukleniyor...");

const commandsPath = path.join(__dirname, "Loki", "Commands");
const loadCommands = (dir) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith(".js")) {
            try {
                const cmdModule = require(filePath);
                const command = cmdModule.default || cmdModule;
                if (command && command.name) {
                    client.commands.set(command.name, command);
                    console.log(`+ Komut Yuklendi: ${command.name}`);
                }
            } catch (err) {
                console.error(`- Komut yuklenirken hata olustu (${file}):`, err);
            }
        }
    }
};

loadCommands(commandsPath);

console.log("[Sistem] Etkinlikler yukleniyor...");

const eventsPath = path.join(__dirname, "Loki", "Events");
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));
    for (const file of eventFiles) {
        try {
            const eventModule = require(path.join(eventsPath, file));
            const event = eventModule.default || eventModule;
            if (event && event.name) {
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(client, ...args));
                } else {
                    client.on(event.name, (...args) => event.execute(client, ...args));
                }
                console.log(`+ Etkinlik Yuklendi: ${event.name}`);
            }
        } catch (err) {
            console.error(`- Etkinlik yuklenirken hata olustu (${file}):`, err);
        }
    }
}

if (!client.config.Token) {
    console.warn("[UYARI] DISCORD_TOKEN ortam degiskeni ayarlanmamis!");
}

client.login(client.config.Token).catch((err) => {
    console.error("[Sistem Hata] Bot Discord'a baglanamadi! Hata:", err.message);
});
