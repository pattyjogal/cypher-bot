import {
  CommandInteraction,
  MessageComponentInteraction,
} from "discord.js";
import { Db } from "mongodb";
import Member from "../models/member";

export type RepliableInteraction =
  | MessageComponentInteraction
  | CommandInteraction;

export abstract class MessageExecutable<T extends RepliableInteraction> {
  constructor(protected interaction: T, protected db: Db) {}

  abstract execute(): Promise<any>;
}

export abstract class RegisteredUserExecutable<
  T extends RepliableInteraction
> extends MessageExecutable<T> {
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
