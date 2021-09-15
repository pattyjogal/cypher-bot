import { Message, MessageEmbed, TextChannel } from "discord.js";
import { Db } from "mongodb";

import Member from "../models/member";

let tenmansQueue: Set<string> = new Set();
let time: String | null;
let activeTenmansMessage: Message | null;

function subcmd_join(interaction, user: Member, db: Db) {
    if (activeTenmansMessage === null) {
        interaction.reply({
          content:
            "I must wait a moment! There is no active 10mans queue.",
          ephemeral: true,
        });
        return;
    }

    tenmansQueue.add(user.gameTag);
    interaction.reply({
        content: "Greetings! You've been added to the queue.",
        ephemeral: true,
    });

    activeTenmansMessage.edit({
        embeds: [createEmbed(time)],
    });
}

function subcmd_leave(interaction, user: Member, db: Db) {
    if (activeTenmansMessage === null) {
        interaction.reply({
          content:
            "I must wait a moment! There is no active 10mans queue.",
          ephemeral: true,
        });
        return;
    }

    tenmansQueue.delete(user.gameTag);
    interaction.reply({
        content:
          "This is no problem; You've been removed from the queue.",
        ephemeral: true,
    });

    activeTenmansMessage.edit({
        embeds: [createEmbed(time)],
    });
}

async function subcmd_start(interaction, user: Member, db: Db) {
    const interaction_user = interaction.user;
    const role = interaction.guild.roles.cache.find(
        (role) => role.name === "Admin"
    );
    if (
        !interaction.guild.members.cache
            .get(interaction_user.id)
            .roles.cache.has(role.id)
    ) {
        interaction.reply({
            content:
            "You're not an admin, so you can't start the queue. Ask an admin to start it.",
            ephemeral: true,
        });
        return;
    }
    time = interaction.options.getString("time");
    tenmansQueue.clear();
    const queueChannel = interaction.guild.channels.cache.get(
        "885704092142428200"
    ) as TextChannel;
    activeTenmansMessage = await queueChannel.send({
        embeds: [createEmbed(time)],
    });
}

async function cmd_tenmans(interaction, db: Db) {
    const user = (await db.collection("members").findOne({
        discordId: interaction.user.id,
    })) as Member;

    if (!user) {
        interaction.reply({
            content:
            "Who are you? Copy of me?! You need to register with me before joining 10mans! Please visit #rules for more info.",
            ephemeral: true,
        });

        return;
    }

    const commands = {
        "join": subcmd_join,
        "leave": subcmd_leave,
        "start": subcmd_start,
    };

    // Wrap function call to pass same args to all methods
    const call_fn = commands[interaction.options.getSubcommand()];
    call_fn(interaction, user, db);
}

const createEmbed = (time) =>
  new MessageEmbed()
    .setColor("#0099ff")
    .setTitle(`Ten Mans: ${time}`)
    .addField(
      "Queue",
      tenmansQueue.size > 0 ? Array.from(tenmansQueue).join("\n") : "No Players"
    )
    .setTimestamp()
    .setFooter("Last Updated");

export default cmd_tenmans;