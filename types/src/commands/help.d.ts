import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../modules/Command";
export default function (this: Command, invokedMessage?: ChatInputCommandInteraction | null): Promise<void>;
