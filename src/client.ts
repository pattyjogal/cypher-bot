import {
  Client,
  DiscordAPIError,
  Intents,
  Message,
  MessageEmbed,
  TextChannel,
} from "discord.js";
import { Db } from "mongodb";

import Member from "./models/member";

let tenmansQueue: Set<string> = new Set();
let time: String | null;
let activeTenmansMessage: Message | null;

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
          case "new":
            {
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
            break;
          case "update":
            {
              const gameTag =
                interaction.options.getString("val_id") || undefined;
              const pronouns =
                interaction.options.getString("pronouns") || undefined;
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
            break;
        }
        break;
      case "tenmans":
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

        switch (interaction.options.getSubcommand()) {
          case "join":
            {
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
            break;
          case "leave":
            {
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
            break;
          case "start": {
            const user = interaction.user;
            const role = interaction.guild.roles.cache.find(
              (role) => role.name === "Admin"
            );
            if (
              !interaction.guild.members.cache
                .get(user.id)
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
        }
    }
  });

  return client;
};
