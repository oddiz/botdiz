import { Command } from "../modules/Command";
import { ChatInputCommandInteraction } from "discord.js";
import "dotenv/config";
export default function (this: Command, invokedMessage?: ChatInputCommandInteraction | null): Promise<void>;
