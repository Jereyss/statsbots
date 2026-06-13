import { GuildMember } from "discord.js";

export default {
    name: "guildMemberAdd",
    execute: async (client: any, member: GuildMember) => {
        const guild = member.guild;
        const cachedInvites = client.invites.get(guild.id);
        if (!cachedInvites) return;

        try {
            const currentInvites = await guild.invites.fetch();
            let usedInvite: any = null;

            for (const [code, inv] of currentInvites.entries()) {
                const cachedUses = cachedInvites.get(code) || 0;
                const currentUses = inv.uses || 0;
                if (currentUses > cachedUses) {
                    usedInvite = inv;
                    // Önbelleği güncelle
                    cachedInvites.set(code, currentUses);
                    break;
                }
            }

            // Önbelleği istemcide (client) güncelle
            client.invites.set(guild.id, cachedInvites);

            if (usedInvite && usedInvite.inviter) {
                const inviter = usedInvite.inviter;
                
                // Sahte hesap tespiti (Hesap 7 günden daha genç ise sahte kabul edilir)
                const isFake = (Date.now() - member.user.createdTimestamp) < 7 * 24 * 60 * 60 * 1000;

                // Davet edenin istatistik belgesini çek veya oluştur
                let inviterDoc = await client.db.findOne({ guildID: guild.id, userID: inviter.id });
                if (!inviterDoc) {
                    inviterDoc = new client.db({
                        guildID: guild.id,
                        userID: inviter.id,
                        voiceActive: { daily: 0, weekly: 0, monthly: 0, total: 0 },
                        messageActive: { daily: 0, weekly: 0, monthly: 0, total: 0 },
                        voiceChannels: new Map(),
                        voiceCategories: new Map(),
                        messageChannels: new Map(),
                        hourlyVoice: Array(24).fill(0),
                        dailyHistory: []
                    });
                }

                // inviteStats alanı tanımsız ise varsayılan yapıyı ata
                if (!inviterDoc.inviteStats) {
                    inviterDoc.inviteStats = { regular: 0, fake: 0, left: 0, bonus: 0, total: 0 };
                }

                if (isFake) {
                    inviterDoc.inviteStats.fake = (inviterDoc.inviteStats.fake || 0) + 1;
                } else {
                    inviterDoc.inviteStats.regular = (inviterDoc.inviteStats.regular || 0) + 1;
                }
                
                inviterDoc.inviteStats.total = (inviterDoc.inviteStats.regular || 0) + (inviterDoc.inviteStats.bonus || 0) - (inviterDoc.inviteStats.left || 0);
                await inviterDoc.save();

                // Katılan üyenin belgesine davetçi ID'sini kaydedelim ki çıktığında davetçiyi düşebilelim
                let joinedDoc = await client.db.findOne({ guildID: guild.id, userID: member.id });
                if (!joinedDoc) {
                    joinedDoc = new client.db({
                        guildID: guild.id,
                        userID: member.id,
                        voiceActive: { daily: 0, weekly: 0, monthly: 0, total: 0 },
                        messageActive: { daily: 0, weekly: 0, monthly: 0, total: 0 },
                        voiceChannels: new Map(),
                        voiceCategories: new Map(),
                        messageChannels: new Map(),
                        hourlyVoice: Array(24).fill(0),
                        dailyHistory: []
                    });
                }
                joinedDoc.inviterID = inviter.id;
                await joinedDoc.save();
            }
        } catch (err) {
            console.error("[Invite Tracker] guildMemberAdd hatası:", err);
        }
    }
};
