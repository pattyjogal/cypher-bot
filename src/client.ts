import { Client, Intents } from "discord.js";
import { Db } from "mongodb";

import cmd_register from "./commands/register";
import {
  cmd_tenmans,
  handleButton as tenmansHandleButton,
} from "./commands/tenmans";

export default (db: Db) => {
  const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

  client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isCommand()) {
      const actions = {
        register: cmd_register,
        tenmans: cmd_tenmans,
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
