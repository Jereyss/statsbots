import { GuildMember } from "discord.js";

export default {
    name: "guildMemberRemove",
    execute: async (client: any, member: GuildMember) => {
        const guild = member.guild;

        try {
            // Ayrılan üyenin davetçi kaydını bulalım
            const joinedDoc = await client.db.findOne({ guildID: guild.id, userID: member.id });
            if (joinedDoc && joinedDoc.inviterID) {
                const inviterID = joinedDoc.inviterID;
                const isFake = (Date.now() - member.user.createdTimestamp) < 7 * 24 * 60 * 60 * 1000;

                let inviterDoc = await client.db.findOne({ guildID: guild.id, userID: inviterID });
                if (inviterDoc) {
                    if (!inviterDoc.inviteStats) {
                        inviterDoc.inviteStats = { regular: 0, fake: 0, left: 0, bonus: 0, total: 0 };
                    }

                    if (isFake) {
                        if (inviterDoc.inviteStats.fake > 0) {
                            inviterDoc.inviteStats.fake -= 1;
                        }
                    } else {
                        if (inviterDoc.inviteStats.regular > 0) {
                            inviterDoc.inviteStats.regular -= 1;
                        }
                        inviterDoc.inviteStats.left = (inviterDoc.inviteStats.left || 0) + 1;
                    }

                    inviterDoc.inviteStats.total = (inviterDoc.inviteStats.regular || 0) + (inviterDoc.inviteStats.bonus || 0) - (inviterDoc.inviteStats.left || 0);
                    await inviterDoc.save();
                }
            }
        } catch (err) {
            console.error("[Invite Tracker] guildMemberRemove hatası:", err);
        }
    }
};
