import { Invite } from "discord.js";

export default {
    name: "inviteCreate",
    execute: async (client: any, invite: Invite) => {
        if (!invite.guild) return;
        const guildInvites = client.invites.get(invite.guild.id) || new Map();
        guildInvites.set(invite.code, invite.uses || 0);
        client.invites.set(invite.guild.id, guildInvites);
    }
};
