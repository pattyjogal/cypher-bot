import { CommandInteraction } from "discord.js";
import { Db } from "mongodb";

import { MessageExecutable } from "./command";

class NewUserSubcommand extends MessageExecutable<CommandInteraction> {
    async execute() {
        const gameTag = this.interaction.options.getString("val_id");
        const pronouns = this.interaction.options.getString("pronouns");
        const existingUser = await this.db.collection("members").findOne({
            discordId: this.interaction.user.id
        });

        // Exit if data for a user already exists
        if (existingUser) {
            this.interaction.reply({
                content:
                    "I already know **exactly** who you are. No need to register again, my friend!",
                ephemeral: true,
            });
            return;
        }

        const result = await this.db.collection("members").insertOne({
            gameTag,
            pronouns,
            discordId: this.interaction.user.id,
        });

        if (!result) {
            this.interaction.reply({
                content:
                    "Ah, my eyes are down. I couldn't register you; check with an admin.",
                ephemeral: true,
            });
        } else {
            this.interaction.reply({
                content:
                    "I know **exactly** who you are; you're registered! Feel free to update with /register update",
                ephemeral: true,
            });
            const user = this.interaction.user;
            const role = this.interaction.guild.roles.cache.find(
                (role) => role.name === "Valorant"
            );
            this.interaction.guild.members.cache.get(user.id).roles.add(role);
        }
    }
}

class UpdateUserSubcommand extends MessageExecutable<CommandInteraction> {
    async execute() {
        const gameTag =
            this.interaction.options.getString("val_id") || undefined;
        const pronouns =
            this.interaction.options.getString("pronouns") || undefined;
        console.log({
            gameTag,
            pronouns,
        });
        const result = await this.db.collection("members").updateOne(
            {
            discordId: this.interaction.user.id,
            },
            {
            $set: {
                gameTag,
                pronouns,
            },
            }
        );

        if (!result) {
            this.interaction.reply({
            content:
                "They found my wire... I couldn't update you; check with an admin.",
            ephemeral: true,
            });
        } else {
            this.interaction.reply({
            content:
                "Caught one; you've been updated! Feel free to update again with /register update",
            ephemeral: true,
            });
        }
    }
}

function cmdRegister(interaction: CommandInteraction, db: Db): void {
    const commands = {
        "new": NewUserSubcommand,
        "update": UpdateUserSubcommand
    };

    const Action = commands[interaction.options.getSubcommand()];
    const subcmd: MessageExecutable<CommandInteraction> = new Action(interaction, db);
    subcmd.execute();
}

export default cmdRegister;
