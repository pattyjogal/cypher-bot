import {
  Message,
  MessageEmbed,
  TextChannel,
  CommandInteraction,
} from "discord.js";
import { Db } from "mongodb";

import { RegisteredUserSubcommand, Subcommand } from "./command";

let tenmansQueue: Set<string> = new Set();
let time: String | null;
let activeTenmansMessage: Message | null;

abstract class SubcommandTenmansQueue extends RegisteredUserSubcommand {
  abstract updateQueue();

  afterUserExecute(): Promise<any> {
    if (activeTenmansMessage === null) {
      this.interaction.reply({
        content: "I must wait a moment! There is no active 10mans queue.",
        ephemeral: true,
      });
      return;
    }

    this.updateQueue();

    activeTenmansMessage.edit({
      embeds: [createEmbed(time)],
    });
  }
}

class SubcommandTenmansJoin extends SubcommandTenmansQueue {
  updateQueue() {
    tenmansQueue.add(this.user.gameTag);
    this.interaction.reply({
      content: "Greetings! You've been added to the queue.",
      ephemeral: true,
    });
  }
}

class SubcommandTenmansLeave extends SubcommandTenmansQueue {
  updateQueue() {
    tenmansQueue.delete(this.user.gameTag);
    this.interaction.reply({
      content: "This is no problem; You've been removed from the queue.",
      ephemeral: true,
    });
  }
}

class SubcommandTenmansStart extends Subcommand {
  async execute(): Promise<any> {
    const interaction_user = this.interaction.user;
    const role = this.interaction.guild.roles.cache.find(
      (role) => role.name === "Admin"
    );

    if (
      !this.interaction.guild.members.cache
        .get(interaction_user.id)
        .roles.cache.has(role.id)
    ) {
      this.interaction.reply({
        content:
          "You're not an admin, so you can't start the queue. Ask an admin to start it.",
        ephemeral: true,
      });
      return;
    }
    time = this.interaction.options.getString("time");
    tenmansQueue.clear();
    const queueChannel = this.interaction.guild.channels.cache.get(
      "887569137319149578"
    ) as TextChannel;
    activeTenmansMessage = await queueChannel.send({
      embeds: [createEmbed(time)],
    });
  }
}

async function cmd_tenmans(interaction, db: Db) {
  const commands: {
    [key: string]: {
      new (interaction: CommandInteraction, db: Db): Subcommand;
    };
  } = {
    join: SubcommandTenmansJoin,
    leave: SubcommandTenmansLeave,
    start: SubcommandTenmansStart,
  };

  // Wrap function call to pass same args to all methods
  const call_fn = commands[interaction.options.getSubcommand()];
  const command = new call_fn(interaction, db);
  command.execute();
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
