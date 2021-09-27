import { Channel } from "discord.js";

class BotConfig {
  constructor(
    public queueMsgChannel?: Channel,
    public minVoteCount?: number,
    public hoursTillVoteClose?: number,
  ) {}
}

export default new BotConfig();
