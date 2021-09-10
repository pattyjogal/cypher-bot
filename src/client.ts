import { Client, Intents } from "discord.js";
import { Db } from "mongodb";

export default (db: Db) => {
  const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

  client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    switch (interaction.commandName) {
      case "register":
        switch (interaction.options.getSubcommand()) {
          case "new": {
            const gameTag = interaction.options.getString("val_id");
            const pronouns = interaction.options.getString("pronouns");
            const result = await db.collection("members").insertOne({
              gameTag,
              pronouns,
              discordId: interaction.user.id,
            });

            if (!result) {
              interaction.reply({
                content:
                  "Ah, my eyes are down. I couldn't register you; check with an admin.",
                ephemeral: true,
              });
            } else {
              interaction.reply({
                content:
                  "I know **exactly** who you are; you're registered! Feel free to update with /register update",
                ephemeral: true,
              });
              const user = interaction.user;
              const role = interaction.guild.roles.cache.find(
                (role) => role.name === "Valorant"
              );
              interaction.guild.members.cache.get(user.id).roles.add(role);
            }
          }
          case "update": {
            const gameTag = interaction.options.getString("val_id") || undefined;
            const pronouns = interaction.options.getString("pronouns") || undefined;
            console.log({
              gameTag,
              pronouns,
            });
            const result = await db.collection("members").updateOne(
              {
                discordId: interaction.user.id,
              },
              {
                $set: {
                  gameTag,
                  pronouns,
                },
              }
            );

            if (!result) {
              interaction.reply({
                content:
                  "They found my wire... I couldn't update you; check with an admin.",
                ephemeral: true,
              });
            } else {
              interaction.reply({
                content:
                  "Caught one; you've been updated! Feel free to update again with /register update",
                ephemeral: true,
              });
            }
          }
        }
        break;
    }
  });

  return client;
};
