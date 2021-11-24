// ===================================
// Libraries
// ===================================
require("dotenv").config();
const Eris = require("eris");
const Constants = Eris.Constants;

const bot = new Eris.CommandClient(
  process.env.TOKEN,
  {},
  {
    description: "Pocketbot NG - powered by Eris",
    owner: "Mastastealth",
    prefix: process.env.LOCALTEST ? "d!" : "!",
  }
);

// ===================================
// Modules
// ===================================
const main = require("./core/main");
const vars = require("./core/vars")(Constants);

// Add some global PB-specific properties to global bot object.
bot.PB = {
  vars,
  main,
  slashCmd: {},
  slashCmds: [],
};

bot.PB.helpers = require("./core/helpers")(bot);
bot.PB.fb = require("./core/firebase")(bot);

// ===================================
// Bot Events
// ===================================

bot.on("ready", () => {
  console.log(
    `Bot logged in ${
      process.env.LOCALTEST ? "locally" : "online"
    } successfully.`
  );
  console.log(Object.keys(bot.commands));

  // Test message with component
  // bot.createMessage(vars.testing, {
  //   content: `Test`,
  //   components: [
  //     {
  //       type: 1,
  //       components: [vars.components.TestBtn],
  //     },
  //   ],
  // });

  // Register all imported commands
  bot.PB.slashCmds.forEach((cmd) => {
    bot.createGuildCommand(vars.chan, cmd.info);
    bot.PB.slashCmd[cmd.info.name] = cmd.cmd;
    console.log(`Registered /${cmd.info.name}`);
  });
});

bot.on("interactionCreate", (action) => {
  const { message, member } = action;
  console.log(action, message);

  if (action instanceof Eris.ComponentInteraction) {
    const id = action.data.custom_id;
    const mem = bot.guilds.get(vars.chan).members.get(member.user.id);

    // Update message when passing to commands
    message.member = mem;
    message.author = mem.user;

    switch (id) {
      case "pbc-signup-v2":
        bot.PB.helpers.exeCmd("signup", { action, message });
        return true;
      default:
        console.log("Component created.");
        return action.createMessage({
          content: "Responded.",
        });
    }
  }

  if (action instanceof Eris.CommandInteraction) {
    const id = action.data.name;

    console.log(`Attempting to execute: ${id}`);
    return bot.PB.slashCmd[id]?.(action);
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

  if (!msg.channel.guild)
    console.log(`[DIRECT MESSAGE] ${msg.author.username}: ${msg.content}`);
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
