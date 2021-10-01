import { Client, Intents } from "discord.js";
import { Db } from "mongodb";

import cmd_register from "./commands/register";
import {
  cmdTenmans,
  handleButton as tenmansHandleButton,
  handleVoteCleaning,
} from "./commands/tenmans";
import { cmdConfig } from "./commands/config";
import botConfig from "./config/botConfig";

async function initBotConfig(client: Client, db: Db) {
  const botConfigCollection = db.collection("config");
  let botConfigDoc = await botConfigCollection.findOne({
    configName: "bot",
  });

  if (!botConfigDoc) {
    // Persist default configuration data
    const defaultChannelId = process.env.DEFAULT_QUEUEMSG_CHANNELID;
    const minVoteCount = process.env.MIN_VOTE_COUNT;
    const hoursTillVoteClose = process.env.HOURS_TO_CLOSE;

    botConfigDoc = await botConfigCollection.insertOne({
      configName: "bot",
      minVoteCount: minVoteCount,
      hoursTillVoteClose: hoursTillVoteClose,
      queueChannelId: defaultChannelId,
    });
  }

  const channelId = botConfigDoc.queueChannelId;

  botConfig.queueMsgChannel = client.channels.cache.get(channelId);
  botConfig.minVoteCount = botConfigDoc.minVoteCount;
  botConfig.hoursTillVoteClose = botConfigDoc.hoursTillVoteClose;

  setInterval(handleVoteCleaning, 300000); // Clean vote embeds every 5 minutes
}

export default (db: Db): Client => {
  const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

  client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    console.log(`Loading configuration data from db...`);
    await initBotConfig(client, db);
    console.log(`Config successfully initialized.`);
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isCommand()) {
      const actions = {
        register: cmd_register,
        tenmans: cmdTenmans,
        config: cmdConfig,
      };

      // Use function table to pass context to specific command
      actions[interaction.commandName](interaction, db);
    } else if (interaction.isButton()) {
      const actions = {
        tenmans: tenmansHandleButton,
      };
      const actionName = interaction.customId.split(".")[0];

      actions[actionName](interaction, db);
    }
  });

  return client;
};
