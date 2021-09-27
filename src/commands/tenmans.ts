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
  Role,
  Collection,
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
let activeVoteMessage: Message | null;
let voteClosingTime: Date | null;

abstract class BaseQueueAction<
  T extends RepliableInteraction
> extends RegisteredUserExecutable<T> {
  constructor(interaction: T, db: Db, protected queueId: string) {
    super(interaction, db);
  }
  /// Verify that the queue id stored in the constructor is correct.
  /// If not, allow child class to throw custom error message and
  /// fail gracefully.
  abstract verifyQueueId() : string;

  /// Perform actions after verifying queue id. Should not modify any
  /// messages related to queue state.
  abstract updateQueue();

  /// Perform actions after updating queue state. This includes things
  /// like updating related embed messages, etc.
  abstract updateUserInterface();

  async afterUserExecute(): Promise<any> {
    const errorMessage = this.verifyQueueId();
    if (errorMessage) {
      this.interaction.reply({
        content: errorMessage,
        ephemeral: true,
      });

      return;
    }

    await this.updateQueue();

    await this.updateUserInterface();
  }
}

abstract class StandardQueueAction<
  T extends RepliableInteraction
> extends BaseQueueAction<T> {
  verifyQueueId() {
    if (activeTenmansMessage === null) {
      return "I must wait a moment! There is no active 10mans queue.";
    }
  }

  updateUserInterface() {
    activeTenmansMessage.edit({
      embeds: [createEmbed(time)],
    });
  }
}

abstract class VoteQueueAction<
  T extends RepliableInteraction
> extends BaseQueueAction<T> {
  verifyQueueId() {
    return "";
  }

  updateUserInterface () {
    const votesStillNeeded = botConfig.minVoteCount - tenmansQueue.length;

    if (!!activeVoteMessage) {
      activeVoteMessage.edit({
        embeds: [createVoteEmbed(votesStillNeeded, time, voteClosingTime)]
      });
    }
  }
}

class JoinQueueButtonAction extends StandardQueueAction<ButtonInteraction> {
  updateQueue() {
    tenmansQueue.push(this.user);
    this.interaction.reply({
      content: "Greetings! You've been added to the queue.",
      ephemeral: true,
    });
  }
}

class LeaveQueueButtonAction extends StandardQueueAction<ButtonInteraction> {
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

class VoteQueueButtonAction extends VoteQueueAction<ButtonInteraction> {
  async updateQueue() {
    const queueChannel = botConfig.queueMsgChannel as TextChannel;

    // Verify that a pingable role exists for 10 mans on this server
    const roleId = await this.interaction.guild.roles.fetch()
    .then((roles: Collection<String, Role>) => {
      for (const role of roles.values()) {
        if (role.name === "10 Mans") {
          return role.id;
        }
      }
    })
    .catch(console.error);

    if (!roleId) {
      this.interaction.reply({
        content: "My camera is destroyed - cannot find a 10 mans role on this server. Message an admin.",
        ephemeral: true,
      });

      return;
    }

    if (tenmansQueue.length >= botConfig.minVoteCount) {
      // Generate proper interactable queue once min votes reached
      await activeVoteMessage.delete();
      voteClosingTime = null;

      activeTenmansMessage = await queueChannel.send({
        embeds: [createEmbed(time)]
      })

      await queueChannel.send({
        content: `<@${roleId}> that Radianite must be ours! A queue has been created!`,
      });
    }
  }
}

class ManualAddUserToQueue extends StandardQueueAction<CommandInteraction> {
  async updateQueue() {
    const targetUser = this.interaction.options.getUser("member");
    const targetMember = (await this.db.collection("members").findOne({
      discordId: targetUser.id,
    })) as Member;
    tenmansQueue.push(targetMember);
    this.interaction.reply({
      content: `User \`${targetUser.username}\` added to the queue.`,
      ephemeral: true,
    });
  }
}

class ManualRemoveUserToQueue extends StandardQueueAction<CommandInteraction> {
  async updateQueue() {
    const targetUser = this.interaction.options.getUser("member");
    const targetMember = (await this.db.collection("members").findOne({
      discordId: targetUser.id,
    })) as Member;
    tenmansQueue = tenmansQueue.filter(
      (member) => member.discordId !== targetMember.discordId
    );
    this.interaction.reply({
      content: `User \`${targetUser.username}\` removed from the queue.`,
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

class TenmansVoteSubcommand extends RegisteredUserExecutable<CommandInteraction> {
  async afterUserExecute() {
    // Verify queue not already active
    if (activeTenmansMessage) {
      this.interaction.reply({
        content: "You should have been looking more closely. There's already a queue - use that one instead!",
        ephemeral: true
      });

      return;
    }

    // Verify bot config is valid
    const requiredConfigs = ["hoursTillVoteClose", "minVoteCount", "queueMsgChannel"];
    for (const setting in requiredConfigs) {
      if (!botConfig[setting]) {
        this.interaction.reply({
          content:
            `Careful now. ${setting} not configured. Please ask an admin to configure this value.`,
          ephemeral: true,
        });
  
        return;
      }
    }

    if (!tenmansQueue?.length) {
      // init queue if it doesn't exist
      voteClosingTime = new Date()
      voteClosingTime.setHours(voteClosingTime.getHours() + botConfig.hoursTillVoteClose)
      time = this.interaction.options.getString("time");

      tenmansQueue = [];
      tenmansQueue.push(this.user);

      const queueChannel = botConfig.queueMsgChannel as TextChannel;
      const queueId = "stub";

      activeVoteMessage = await queueChannel.send({
        embeds: [createVoteEmbed(botConfig.minVoteCount, time, voteClosingTime)],
        components: [createVoteQueueActionRow(queueId)],
      });
    } else {
      this.interaction.reply({
        content: "Cage triggered. A vote is already active, check it out!",
        ephemeral: true,
      });

      return;
    }
  }
}

export async function cmd_tenmans(interaction: CommandInteraction, db: Db) {
  const commands: {
    [key: string]: {
      new (
        interaction: Interaction,
        db: Db,
        queueId: string
      ): MessageExecutable<CommandInteraction>;
    };
  } = {
    start: SubcommandTenmansStart,
    end: TenmansCloseSubcommand,
    vote: TenmansVoteSubcommand,
    add_user: ManualAddUserToQueue,
    remove_user: ManualRemoveUserToQueue,
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
  const command = new Action(interaction, db, interaction.options.getString("queueId"));
  command.execute();
}

export async function handleButton(interaction: ButtonInteraction, db: Db) {
  const commands: {
    [key: string]: {
      new (
        interaction: ButtonInteraction,
        db: Db,
        queueId: string
      ): BaseQueueAction<ButtonInteraction>;
    };
  } = {
    join: JoinQueueButtonAction,
    leave: LeaveQueueButtonAction,
    vote: VoteQueueButtonAction,
  };
  const actionParts = interaction.customId.split(".");
  const [commandName, queueId] = actionParts[actionParts.length - 1].split(":");
  const Action = commands[commandName];
  if (Action === undefined) {
    console.error("Bad action:", interaction.customId);
    interaction.reply({
      ephemeral: true,
      content: "Error logged; please tell an admin what you were trying to do.",
    });
    return;
  }
  const command = new Action(interaction, db, queueId);
  command.execute();
}

// TODO: Move embed generators into their own directory/module
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

const createVoteEmbed = (votesStillNeeded: number, time, closingTime: Date) =>
  new MessageEmbed()
    .setColor("#0099ff")
    .setTitle(`Ten Mans Vote For ${time}`)
    .addField("Votes needed to start queue: ", votesStillNeeded.toString(), true)
    .addField(
      "Discord Member",
      tenmansQueue.length > 0
        ? tenmansQueue.map((member) => `<@${member.discordId}>`).join("\n")
        : "No Players",
      true
    )
    .setTimestamp()
    .setFooter("Vote ends at", closingTime.toLocaleString());

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

const createVoteQueueActionRow = (queueId) => {
  return new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(`tenmans.vote:${queueId}`)
      .setLabel("Vote")
      .setStyle(Constants.MessageButtonStyles.SUCCESS),
  );
};

export async function handleVoteCleaning() {
  if (activeVoteMessage) {
    // Close vote if it has expired
    if (voteClosingTime < new Date()) {
      await activeVoteMessage.delete();
      
      tenmansQueue = [];
      voteClosingTime = null;
    }
  }
}
