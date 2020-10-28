// ===================================
// Libraries
// ===================================
require("dotenv").config();
const Eris = require("eris");

// ===================================
// Modules
// ===================================
const main = require("./core/main");
const vars = require("./core/vars");

const bot = new Eris.CommandClient(
	process.env.TOKEN, {}, 
	{
		description: "Pocketbot NG - powered by Eris",
		owner: "Mastastealth",
		prefix: process.env.LOCALTEST ? "d!" : "!"
	}
);

bot.PB = {
	vars,
	main
};

const tourney = require("./cmds/tourney")(bot);
const admin = require("./cmds/admin")(bot);

// ===================================
// Bot Events
// ===================================
bot.on("ready", () => {
	console.log(`Bot logged in ${process.env.LOCALTEST ? "locally" : "online"} successfully.`);
	console.log(Object.keys(bot.commands));
});

bot.on("disconnect", () => {
	console.log("Disconnected from Discord...", "Error");
});

bot.on("presenceUpdate", (user, old) => {
	main.checkPresence(user, bot, old);
});

bot.on("messageCreate", async (msg) => {
	// On every message we do some checks
	main.checkSelf(msg, bot);
	main.checkSpam(msg, bot);
	main.checkToxic(msg, bot);

	if (!msg.channel.guild) console.log(`[DIRECT MESSAGE] ${msg.author.username}: ${msg.content}`);
});

bot.on("guildMemberAdd", (guild, member) => {
	// When a member joins the server
	console.log(`New User: ${member.username} aka ${member.nick} | ${member.id}`);
	if (process.env.LOCALTEST) return false;

	const from = `<@${member.id}>`;

	bot.createMessage(`Glad you found the Pocketwatch community, ${from}, we hope you enjoy your stay. :)>\n\n If you ever need my help, feel free to type in \`!help\` in any channel or here in a private message. :thumbsup:

The Recruit role is given to those who own the game. If the bot detects you playing the game, you should be auto-roled. If not, just let a moderator know. `);
});

// ===================================
// Extra Pocketbot Tasks
// ===================================
main.pbcCron(bot);
main.lucille(bot); // Twitter

// ===================================
// Get all other commands and start!
// ===================================
try {
	tourney.register();
	admin.register();
	// TODO - bank.register();
	// TODO - info.register();
	// TODO - quotes.register();

	bot.connect();
} catch(e) {
	console.error(e);
}