import { Channel, CommandInteraction, Interaction } from "discord.js";
import { Db } from "mongodb";
import { MessageExecutable } from "./command";

import botConfig from "../config/botConfig";

class DefaultChannelSubcommand extends MessageExecutable<CommandInteraction> {
  async execute() {
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
        content: "Only admins can execute this command.",
        ephemeral: true,
      });
      return;
    }

    const channel = this.interaction.options.getChannel("channel") as Channel;
    if (!channel) {
      this.interaction.reply({
        content: "Provided channel was not valid. Please check logs for help.",
        ephemeral: true,
      });

      console.log(this.interaction.options);
    }

    botConfig.queueMsgChannel = channel;

    // Persist channel
    this.db.collection("config").updateOne(
      {
        configName: "bot",
      },
      {
        $set: {
          queueChannelId: botConfig.queueMsgChannel.id,
        }
      }
    );

    this.interaction.reply({
      content: "Queue channel updated!",
      ephemeral: true,
    });
  }
}

export async function cmdConfig(interaction, db: Db) {
  const commands: {
    [key: string]: {
      new (
        interaction: Interaction,
        db: Db
      ): MessageExecutable<CommandInteraction>;
    };
  } = {
    default_channel: DefaultChannelSubcommand,
  };

  // Wrap function call to pass same args to all methods
  const Action = commands[interaction.options.getSubcommand()];
  if (Action === undefined) {
    console.error("Bad action:", interaction.options.getSubcommand());
    interaction.reply({
      ephemeral: true,
      content: "Error logged; please tell an admin what you were trying to do.",
    });
    return;
  }
  const command = new Action(interaction, db);
  command.execute();
}
