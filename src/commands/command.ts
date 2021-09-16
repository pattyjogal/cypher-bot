import { CommandInteraction } from "discord.js";
import { Db } from "mongodb";
import Member from "../models/member";

export abstract class Subcommand {
  constructor(protected interaction: CommandInteraction, protected db: Db) {}

  abstract execute(): Promise<any>;
}

export abstract class RegisteredUserSubcommand extends Subcommand {
  protected user: Member;

  async execute(): Promise<any> {
    const user = (await this.db.collection("members").findOne({
      discordId: this.interaction.user.id,
    })) as Member;

    if (!user) {
      this.interaction.reply({
        content:
          "Who are you? Copy of me?! You need to register with me before joining 10mans! Please visit #rules for more info.",
        ephemeral: true,
      });

      return;
    }

    this.user = user;
    this.afterUserExecute();
  }

  abstract afterUserExecute(): Promise<any>;
}
