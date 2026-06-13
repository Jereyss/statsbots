import { VoiceState } from "discord.js";
import moment from "moment";

export default {
    name: "voiceStateUpdate",
    execute: async (client: any, oldState: VoiceState, newState: VoiceState) => {
        // Botları es geç
        if (oldState.member?.user.bot || newState.member?.user.bot) return;

        const member = newState.member || oldState.member;
        if (!member) return;

        const guild = newState.guild || oldState.guild;
        const userId = member.id;
        const guildId = guild.id;

        // Sunucunun AFK Kanalı
        const afkChannelId = guild.afkChannelId;

        /**
         * Kullanıcının ses istatistiği kazanmaya uygun olup olmadığını denetler.
         */
        const isEligible = (state: VoiceState): boolean => {
            return !!(
                state.channelId && 
                state.channelId !== afkChannelId && 
                !state.selfDeaf && 
                !state.serverDeaf
            );
        };

        const wasEligible = isEligible(oldState);
        const nowEligible = isEligible(newState);

        // Bellekteki ses oturumunu çek
        const session = client.voiceSessions.get(userId);

        // DURUM 1: Kullanıcı istatistik almaya uygun hale geldi (Sese girdi, AFK'dan çıktı veya sağırlaşmayı açtı)
        if (!wasEligible && nowEligible && newState.channelId) {
            client.voiceSessions.set(userId, {
                channelId: newState.channelId,
                joinedAt: Date.now()
            });
        }
        
        // DURUM 2: Kullanıcı istatistik almaya uygunsuz hale geldi (Sesten çıktı, AFK'ya geçti veya sağırlaştı)
        else if (wasEligible && !nowEligible) {
            if (session) {
                const duration = Math.floor((Date.now() - session.joinedAt) / 1000); // Saniye cinsinden süre
                if (duration > 0) {
                    await saveVoiceStats(client, guildId, userId, session.channelId, duration);
                }
                client.voiceSessions.delete(userId);
            }
        }
        
        // DURUM 3: Kullanıcı uygun kalmaya devam etti ama kanal değiştirdi
        else if (wasEligible && nowEligible && oldState.channelId !== newState.channelId && newState.channelId) {
            if (session) {
                const duration = Math.floor((Date.now() - session.joinedAt) / 1000);
                if (duration > 0) {
                    await saveVoiceStats(client, guildId, userId, session.channelId, duration);
                }
            }
            
            // Yeni kanal için yeni oturum başlat
            client.voiceSessions.set(userId, {
                channelId: newState.channelId,
                joinedAt: Date.now()
            });
        }
    }
};

/**
 * Kullanıcının ses istatistiklerini MongoDB'ye kaydeder.
 */
async function saveVoiceStats(client: any, guildId: string, userId: string, channelId: string, duration: number) {
    const currentHour = moment().hour(); // Gün içindeki saat dilimi (0-23)

    // Sunucu ayarlarını önbellekten dinamik çekelim
    const guildConfig = await client.getSettings(guildId);

    // --- Filtreleme Kontrolleri (İstatistiklerden Muaf Tutma) ---
    const isUserFiltered = guildConfig.filteredUsers?.includes(userId) || false;
    const isChannelFiltered = guildConfig.filteredChannels?.includes(channelId) || false;
    
    const guildObj = client.guilds.cache.get(guildId);
    const memberObj = guildObj?.members.cache.get(userId);
    const isRoleFiltered = memberObj?.roles.cache.some((role: any) => guildConfig.filteredRoles?.includes(role.id)) || false;

    if (isUserFiltered || isChannelFiltered || isRoleFiltered) {
        return; // İstatistiklerden muaf tutulmuş ise kaydı es geç
    }

    // Kanalın bağlı olduğu Kategori ID'sini (parentId) çekelim
    const channel = client.guilds.cache.get(guildId)?.channels.cache.get(channelId);
    const parentId = channel?.parentId;

    // Kanalın hangi kategoride olduğunu tespit et
    let categoryKey = "other";
    if (guildConfig.voiceCategories) {
        for (const [key, category] of guildConfig.voiceCategories.entries()) {
            if (category.channels.includes(channelId) || (parentId && category.channels.includes(parentId))) {
                categoryKey = key;
                break;
            }
        }
    }

    try {
        // client.db (UserStats modeli) üzerinden veritabanı güncellemesi yapıyoruz
        await client.db.findOneAndUpdate(
            { guildID: guildId, userID: userId },
            {
                $inc: {
                    "voiceActive.daily": duration,
                    "voiceActive.weekly": duration,
                    "voiceActive.monthly": duration,
                    "voiceActive.total": duration,
                    [`voiceChannels.${channelId}`]: duration,
                    [`voiceCategories.${categoryKey}`]: duration,
                    [`hourlyVoice.${currentHour}`]: duration
                }
            },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error("[Veritabanı Hata] Ses süresi kaydedilemedi:", err);
    }
}
