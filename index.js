// ===================================
// Libraries
// ===================================
require("dotenv").config();
const { Client } = require("yuuko");
const path = require("path");

// ===================================
// Modules
// ===================================
const main = require("./core/main");
const vars = require("./core/vars");

const bot = new Client({
	token: process.env.TOKEN,
	description: "Pocketbot 2.0 - powered by Eris + Yuuko",
	owner: "Mastastealth",
	prefix: "d!"
});

bot.PB = {
	vars
};

bot.on("ready", () => {
	console.log("Bot logged in successfully.");
});

bot.on("disconnect", () => {
	console.log("Disconnected from Discord...", "Error");
});

bot.on("presenceUpdate", (user, old) => {
	main.checkPresence(user, bot, old);
});

// On every message we do some checks
bot.on("messageCreate", async (msg) => { // When a message is created
	main.checkSelf(msg, bot);
	main.checkSpam(msg, bot);
	main.checkToxic(msg, bot);

	if (!msg.channel.guild) console.log(`[DIRECT MESSAGE] ${msg.author.username}: ${msg.content}`);
});

// When a member joins
bot.on("guildMemberAdd", (guild, member) => {
	console.log(`New User: ${member.username} aka ${member.nick} | ${member.id}`);
	if (process.env.LOCALTEST) return false;

	const from = `<@${member.id}>`;

	bot.createMessage(`Glad you found the Pocketwatch community, ${from}, we hope you enjoy your stay. :)>\n\n If you ever need my help, feel free to type in \`!help\` in any channel or here in a private message. :thumbsup:

The Recruit role is given to those who own the game. If the bot detects you playing the game, you should be auto-roled. If not, just let a moderator know. `);
});

// PBC Cron Jobs
main.pbcCron(bot);

try {
	bot.addCommandDir(path.join(__dirname, "cmds")).connect();
} catch(e) {
	console.error(e);
}