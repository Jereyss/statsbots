import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import * as fs from "fs";
import * as path from "path";
import { BotSettings } from "./Global/BotSettings";
import GuildConfig from "./Global/Schema/GuildConfig";
import UserStats from "./Global/Schema/UserStats";
import { CanvasHelper } from "./Global/Utils/CanvasHelper";

// Discord Bot Client Tanımlaması (Gerekli tüm intentler aktif)
const client: any = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences, // Kullanıcı durum ışıklarının tespiti için zorunludur
        GatewayIntentBits.GuildInvites,   // Davet olaylarını dinlemek için zorunludur
        GatewayIntentBits.GuildMembers    // Üye giriş/çıkış olayları için zorunludur
    ],
    partials: [Partials.Message, Partials.Channel, Partials.User]
});

// --- 📦 CONTAINER BUILD (Konteyner Yapılandırması) 📦 ---
client.commands = new Collection();
client.voiceSessions = new Map(); // { userID: { channelId, joinedAt } }
client.guildConfigs = new Map(); // Sunucu ayarları bellek içi hızlı önbellek (Cache)

// Veritabanı Modülleri Konteyner Entegrasyonu
client.db = UserStats;
client.guildConfigDb = GuildConfig;

// Yapılandırma ve Çizim Motoru Konteyner Entegrasyonu
client.config = BotSettings;
client.canvas = CanvasHelper;

// Emojileri Yükle ve Konteyner Altında Birleştir
let emojisCached: { [key: string]: string } = {};
try {
    const emojiPath = path.join(__dirname, "Global", "emoji.json");
    const emojilerPath = path.join(__dirname, "Global", "emojiler.json");
    
    const file1 = fs.existsSync(emojiPath) ? JSON.parse(fs.readFileSync(emojiPath, "utf-8")) : {};
    const file2 = fs.existsSync(emojilerPath) ? JSON.parse(fs.readFileSync(emojilerPath, "utf-8")) : {};
    
    emojisCached = { ...file1, ...file2 };
} catch (err) {
    console.error("[Container Hata] Emojiler önbelleğe yüklenemedi:", err);
}

// Akıllı Emoji Fonksiyonu (client.emoji)
client.emoji = (name: string): string => {
    return emojisCached[name] || "";
};

// Hızlı ayar okuma metodu (client.getSettings)
client.getSettings = async (guildId: string) => {
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

// --- ⚙️ DİNAMİK YÜKLEYİCİLER ⚙️ ---
console.log("[Sistem] Komutlar yükleniyor...");

const commandsPath = path.join(__dirname, "Loki", "Commands");
const loadCommands = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith(".ts") || file.endsWith(".js")) {
            try {
                const cmdModule = require(filePath);
                const command = cmdModule.default || cmdModule;
                
                if (command && command.name) {
                    client.commands.set(command.name, command);
                    console.log(`+ Komut Yüklendi: ${command.name}`);
                }
            } catch (err) {
                console.error(`- Komut yüklenirken hata oluştu (${file}):`, err);
            }
        }
    }
};

loadCommands(commandsPath);

console.log("[Sistem] Etkinlikler yükleniyor...");

const eventsPath = path.join(__dirname, "Loki", "Events");
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".ts") || file.endsWith(".js"));
    for (const file of eventFiles) {
        try {
            const eventModule = require(path.join(eventsPath, file));
            const event = eventModule.default || eventModule;

            if (event && event.name) {
                if (event.once) {
                    client.once(event.name, (...args: any[]) => event.execute(client, ...args));
                } else {
                    client.on(event.name, (...args: any[]) => event.execute(client, ...args));
                }
                console.log(`+ Etkinlik Yüklendi: ${event.name}`);
            }
        } catch (err) {
            console.error(`- Etkinlik yüklenirken hata oluştu (${file}):`, err);
        }
    }
}

// Bot Token Kontrolü ve Login
if (!client.config.Token || client.config.Token === "BOT_TOKENINIZI_BURAYA_YAZIN") {
    console.warn("[⚠️ UYARI] Lütfen 'Global/BotSettings.ts' dosyasındaki 'Token' alanını geçerli Discord Bot Token'ınız ile doldurun!");
}

client.login(client.config.Token).catch((err: any) => {
    console.error("[Sistem Hata] Bot Discord'a bağlanamadı! Hata:", err.message);
});
