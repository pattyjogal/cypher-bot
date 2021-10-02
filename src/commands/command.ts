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

  abstract execute(): Promise<void>;
}

export abstract class RegisteredUserExecutable<
  T extends RepliableInteraction
> extends MessageExecutable<T> {
  protected user: Member;

  async execute(): Promise<void> {
    const user = (await this.db.collection("members").findOne({
      discordId: this.interaction.user.id,
    })) as Member;

    if (!user) {
      this.interaction.reply({
        content:
          "Who are you? You need to register with me before participating in 10mans! Please visit #rules for more info.",
        ephemeral: true,
      });

      return;
    }

    this.user = user;
    this.afterUserExecute();
  }

  abstract afterUserExecute(): Promise<void>;
}
