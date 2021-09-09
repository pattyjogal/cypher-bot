import { Client, Intents } from "discord.js";
import { Db } from "mongodb";

export default (db: Db) => {
  const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

  client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    console.log(interaction.options.getString(""));
    switch (interaction.commandName) {
      case "register":
        switch (interaction.options.getSubcommand()) {
          case "new":
            const gameTag = interaction.options.getString("val_id");
            const pronouns = interaction.options.getString("pronouns");
            const result = await db.collection("members").insertOne({
              gameTag,
              pronouns
            });

            if (!result) {
              interaction.reply("Failed to register.");
            } else {
              interaction.reply("Registered! Feel free to update with /register update");
            }
        }
        await interaction.reply("pong");
        break;
    }
  });

  return client;
};
