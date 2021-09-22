import { Channel } from "discord.js";

class BotConfig {
    constructor(
        public queueMsgChannel ?:Channel
    ) {}
}

export default new BotConfig();