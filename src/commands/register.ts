import { Db } from "mongodb";

async function subcmd_new(interaction, db: Db) {
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

async function subcmd_update(interaction, db: Db) {
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

function cmd_register(interaction, db: Db) {
    const commands = {
        "new": subcmd_new,
        "update": subcmd_update
    };

    // Wrap function call to pass same args to all methods
    const call_fn = commands[interaction.options.getSubcommand()];
    call_fn(interaction, db);
}

export default cmd_register;
