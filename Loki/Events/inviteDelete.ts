import { Invite } from "discord.js";

export default {
    name: "inviteDelete",
    execute: async (client: any, invite: Invite) => {
        if (!invite.guild) return;
        const guildInvites = client.invites.get(invite.guild.id);
        if (guildInvites) {
            guildInvites.delete(invite.code);
        }
    }
};
