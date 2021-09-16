import { REST } from "@discordjs/rest";
import { Routes, ApplicationCommandOptionType } from "discord-api-types/v9";
import { MongoClient } from "mongodb";
import client from "./client";

const CLIENT_ID = "885286855275327518";

const MOD_COMMANDS = [
  "tenmans start"
]

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
      {
        name: "update",
        description: "Updates your info",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "val_id",
            description: "Your new in-game Valorant ID",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "pronouns",
            description: "Your new preferred third-person pronouns (used by casters)",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
        ]
      }
    ],
  },
  {
    name: "tenmans",
    description: "Interacts with the 10mans lobby",
    options: [
      {
        name: "join",
        description: "Joins the 10mans lobby",
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: "leave",
        description: "Leaves the 10mans lobby",
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: "start",
        description: "Starts a 10mans queue",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "time",
            description: "The time to start queue",
            type: ApplicationCommandOptionType.String,
          }
        ]
      },
      {
        name: "vote",
        description: "Vote to start a 10mans lobby.",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "time",
            description: "The time to start the queue",
            type: ApplicationCommandOptionType.String
          }
        ]
      }
    ]
  }
];

const rest = new REST({ version: "9" }).setToken(process.env.CYPHER_BOT_TOKEN);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, "725570244256464896"),
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
  const client = await MongoClient.connect(process.env.DB_CONN_STRING, {
    ignoreUndefined: true,
  });

  await client.connect();
  return client.db(process.env.DB_NAME);
}
