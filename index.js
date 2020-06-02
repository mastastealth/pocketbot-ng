// ===================================
// Libraries
// ===================================
require("dotenv").config();
const Eris 	= require("eris");

// ===================================
// Modules
// ===================================
const main = require("./core/main");
const vars = require("./core/vars");

const bot = new Eris.CommandClient(process.env.TOKEN, {
	description: "Pocketbot 2.0 - powered by Eris",
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

// On every message we do some checks
bot.on("messageCreate", async (msg) => { // When a message is created
	main.checkSelf(msg, bot);
	main.checkSpam(msg, bot);
	main.checkToxic(msg, bot);

	if (!msg.channel.guild) console.log(`[DIRECT MESSAGE] ${msg.author.username}: ${msg.content}`);
});

// When a member joins
// ...

// PBC Cron Jobs
// ...

try {
	bot.connect();
} catch(e) {
	console.error(e);
}