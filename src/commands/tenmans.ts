import {
  Message,
  MessageEmbed,
  TextChannel,
  CommandInteraction,
  MessageActionRow,
  MessageButton,
  Constants,
  ButtonInteraction,
  Interaction,
  GuildApplicationCommandManager,
} from "discord.js";
import { Db } from "mongodb";
import botConfig from "../config/botConfig";
import Member from "../models/member";

import {
  MessageExecutable,
  RegisteredUserExecutable,
  RepliableInteraction,
} from "./command";

let tenmansQueue: Member[] = [];
let time: String | null;
let activeTenmansMessage: Message | null;

abstract class QueueAction<
  T extends RepliableInteraction
> extends RegisteredUserExecutable<T> {
  constructor(interaction: T, db: Db, protected queueId: string) {
    super(interaction, db);
  }

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

class JoinQueueButtonAction extends QueueAction<ButtonInteraction> {
  updateQueue() {
    tenmansQueue.push(this.user);
    this.interaction.reply({
      content: "Greetings! You've been added to the queue.",
      ephemeral: true,
    });
  }
}

class LeaveQueueButtonAction extends QueueAction<ButtonInteraction> {
  updateQueue() {
    tenmansQueue = tenmansQueue.filter(
      (member) => member.discordId !== this.user.discordId
    );
    this.interaction.reply({
      content: "This is no problem; You've been removed from the queue.",
      ephemeral: true,
    });
  }
}

class SubcommandTenmansStart extends MessageExecutable<CommandInteraction> {
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
    tenmansQueue = [];
    const queueChannel = botConfig.queueMsgChannel as TextChannel;
    if (!queueChannel) {
      this.interaction.reply({
        content:
          "No queue message channel configured. Please set channel id using '/config defaultChannel'.",
        ephemeral: true,
      });
    }

    const queueId = "stub";

    activeTenmansMessage = await queueChannel.send({
      embeds: [createEmbed(time)],
      components: [createQueueActionRow(queueId)],
    });
  }
}

class TenmansCloseSubcommand extends MessageExecutable<CommandInteraction> {
  async execute(): Promise<any> {
    // Verify privilege
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
          "You're not an admin, so you can't close the queue. Ask an admin to close it.",
        ephemeral: true,
      });
      return;
    }

    // Teardown - clear current queue
    tenmansQueue = []
    await activeTenmansMessage?.delete();
  }
}

export async function cmd_tenmans(interaction, db: Db) {
  const commands: {
    [key: string]: {
      new (
        interaction: Interaction,
        db: Db
      ): MessageExecutable<CommandInteraction>;
    };
  } = {
    start: SubcommandTenmansStart,
    end: TenmansCloseSubcommand
  };

  // Wrap function call to pass same args to all methods
  const Action = commands[interaction.options.getSubcommand()];
  if (Action === undefined) {
    console.error("Bad action:", interaction.options.getSubcommand());
    interaction.reply({
      ephemeral: true,
      content: "Error logged; please tell an admin what you were trying to do."
    });
    return;
  }
  const command = new Action(interaction, db);
  command.execute();
}

export async function handleButton(interaction: ButtonInteraction, db: Db) {
  const commands: {
    [key: string]: {
      new (
        interaction: ButtonInteraction,
        db: Db,
        queueId: string
      ): QueueAction<ButtonInteraction>;
    };
  } = {
    join: JoinQueueButtonAction,
    leave: LeaveQueueButtonAction,
  };
  const actionParts = interaction.customId.split(".");
  const [commandName, queueId] = actionParts[actionParts.length - 1].split(":");
  const Action = commands[commandName];
  if (Action === undefined) {
    console.error("Bad action:", interaction.customId);
    interaction.reply({
      ephemeral: true,
      content: "Error logged; please tell an admin what you were trying to do."
    });
    return;
  }
  const command = new Action(interaction, db, queueId);
  command.execute();
}

const createEmbed = (time) =>
  new MessageEmbed()
    .setColor("#0099ff")
    .setTitle(`Ten Mans: ${time}`)
    .addField(
      "Discord Member",
      tenmansQueue.length > 0
        ? tenmansQueue.map((member) => `<@${member.discordId}>`).join("\n")
        : "No Players",
      true
    )
    .addField(
      "Valorant Tag",
      tenmansQueue.length > 0
        ? tenmansQueue.map((member) => "`" + member.gameTag + "`").join("\n")
        : "❌",
      true
    )
    .setTimestamp()
    .setFooter("Last Updated");

const createQueueActionRow = (queueId) => {
  return new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(`tenmans.join:${queueId}`)
      .setLabel("Join")
      .setStyle(Constants.MessageButtonStyles.SUCCESS),
    new MessageButton()
      .setCustomId(`tenmans.leave:${queueId}`)
      .setLabel("Leave")
      .setStyle(Constants.MessageButtonStyles.DANGER)
  );
};
