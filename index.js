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
// const fb = require("../core/firebase");

const bot = new Eris.CommandClient(
	process.env.TOKEN, {}, 
	{
		description: "Pocketbot NG - powered by Eris",
		owner: "Mastastealth",
		prefix: process.env.LOCALTEST ? "d!" : "!"
	}
);

// Add some global PB-specific properties to global bot object.
bot.PB = {
	vars,
	main,
	// fb
};

// ===================================
// Bot Events
// ===================================
bot.on("ready", () => {
	console.log(`Bot logged in ${process.env.LOCALTEST ? "locally" : "online"} successfully.`);
	console.log(Object.keys(bot.commands));
});

bot.on("disconnect", () => {
	console.error("Disconnected from Discord...");
});

bot.on("presenceUpdate", (user, old) => {
	main.checkPresence(user, bot, old);
});

// On every message we do some checks
bot.on("messageCreate", async (msg) => {
	main.checkSelf(msg, bot);
	main.checkSpam(msg, bot);
	main.checkToxic(msg, bot);

	if (!msg.channel.guild) console.log(`[DIRECT MESSAGE] ${msg.author.username}: ${msg.content}`);
});

// ===================================
// Extra Pocketbot Tasks
// ===================================
main.pbcCron(bot);
main.lucille(bot); // Twitter

// ===================================
// Get all other commands and start!
// ===================================

// Import command groups
const tourney = require("./cmds/tourney")(bot);
const admin = require("./cmds/admin")(bot);
const other = require("./cmds/other")(bot);

try {
	tourney.register();
	admin.register();
	// TODO - bank.register();
	// TODO - info.register();
	// TODO - quotes.register();
  other.register();

	bot.connect();
} catch(e) {
	console.error(e);
}