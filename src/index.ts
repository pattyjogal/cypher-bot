import { REST } from "@discordjs/rest";
import { Routes, ApplicationCommandOptionType } from "discord-api-types/v9";
import { MongoClient } from "mongodb";
import client from "./client";

const CLIENT_ID = "885286855275327518";

const commands = [
  {
    name: "register",
    description: "Registers your info",
    options: [
      {
        name: "new",
        description: "Registers a new user",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "val_id",
            description: "Your in-game Valorant ID",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
          {
            name: "pronouns",
            description: "Your preferred third-person pronouns (used by casters)",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
        ]
      },
    ],
  },
];

const rest = new REST({ version: "9" }).setToken(process.env.CYPHER_BOT_TOKEN);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, "883070542536650824"),
      {
        body: commands,
      }
    );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }

  const db = await setupDB();

  client(db).login(process.env.CYPHER_BOT_TOKEN);
})();

// DB Setup
async function setupDB() {
  const client = await MongoClient.connect(process.env.DB_CONN_STRING);

  await client.connect();
  return client.db(process.env.DB_NAME);
}
