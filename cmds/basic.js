/* ----------------------------------------
	This file contains the basic example of
	a new command file. Also the !help
 ---------------------------------------- */
const {Command} = require("yuuko");

module.exports = new Command("ping", (msg) => {
	msg.channel.createMessage("🏓 Pong!");
});