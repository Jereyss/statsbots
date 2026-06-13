module.exports = {
    name: "inviteDelete",
    execute: async (client, invite) => {
        if (!invite.guild) return;
        const guildInvites = client.invites.get(invite.guild.id);
        if (guildInvites) {
            guildInvites.delete(invite.code);
        }
    }
};
