// ===================================
// Libraries
// ===================================
require("dotenv").config();
const Eris = require("eris");
const ErisC = require("eris-components");

const ebot = new Eris.CommandClient(
  process.env.TOKEN, {},
  {
    description: "Pocketbot NG - powered by Eris",
    owner: "Mastastealth",
    prefix: process.env.LOCALTEST ? "d!" : "!"
  }
);

const bot = ErisC.Client(ebot);
  
// ===================================
// Modules
// ===================================
const main = require("./core/main");
const vars = require("./core/vars")(ErisC);

// Add some global PB-specific properties to global bot object.
bot.PB = {
  vars,
  main
};

bot.PB.helpers = require("./core/helpers")(bot);
bot.PB.fb = require("./core/firebase")(bot);

// ===================================
// Bot Events
// ===================================

bot.on("ready", () => {
  console.log(`Bot logged in ${process.env.LOCALTEST ? "locally" : "online"} successfully.`);
  console.log(Object.keys(bot.commands));
});

bot.on("clickButton", (resBody) => {
  const { message, member, channel_id } = resBody;
  const id = resBody.data.custom_id;
  const chan = bot.guilds.get(vars.chan).channels.get(channel_id);
  const mem = bot.guilds.get(vars.chan).members.get(member.user.id);

  // Update message when passing to commands
  message.member = mem;
  message.author = mem.user;
  message.channel = chan;

  switch(id) {
    case "pbc-signup":
      bot.PB.helpers.exeCmd("signup", { resBody, message });
      return true;
  }
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
// Get all other commands and start!
// ===================================

// Import command groups
const tourney = require("./cmds/tourney")(bot);
const admin = require("./cmds/admin")(bot);
const bank = require("./cmds/bank")(bot);
const other = require("./cmds/other")(bot);
const info = require("./cmds/info")(bot);

try {
  tourney.register();
  admin.register();
  bank.register();
  info.register();
  // TODO - quotes.register();
  other.register();

  bot.connect();

  // ===================================
  // Extra Pocketbot Tasks
  // ===================================
  main.pbcCron(bot);
  main.lucille(bot); // Twitter
} catch (e) {
  console.error(e);
}
