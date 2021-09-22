import { Client, Intents } from "discord.js";
import { config } from "dotenv";
import { Db } from "mongodb";

import cmd_register from "./commands/register";
import {
  cmd_tenmans,
  handleButton as tenmansHandleButton,
} from "./commands/tenmans";
import { cmdConfig } from "./commands/config";
import botConfig from "./config/botConfig";

async function initBotConfig (client: Client, db: Db) {
  const botConfigCollection = db.collection("config");
  let botConfigDoc = await botConfigCollection.findOne({
    "configName": "bot"
  });
    
  if (!botConfigDoc) {
    // Persist default configuration data
    const defaultChannelId = process.env.DEFAULT_QUEUEMSG_CHANNELID || "885704092142428200";

    botConfigDoc = await botConfigCollection.insertOne({
      "configName": "bot",
      "queueChannelId": defaultChannelId
    });
  }

  const channelId = botConfigDoc.queueChannelId;
  botConfig.queueMsgChannel = client.channels.cache.get(channelId);
}

export default (db: Db) => {
  const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

  client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    console.log(`Loading configuration data from db...`);
    await initBotConfig(this, db);
    console.log(`Config successfully initialized.`);
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isCommand()) {
      const actions = {
        register: cmd_register,
        tenmans: cmd_tenmans,
        config: cmdConfig
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
