import { Command } from "../modules/Command";
import { ChatInputCommandInteraction } from "discord.js";
export default function (this: Command, invokedMessage?: ChatInputCommandInteraction | null): Promise<void>;
