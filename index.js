// ===================================
// Libraries
// ===================================
require("dotenv").config();
const Eris = require("eris");
const Constants = Eris.Constants;

const bot = new Eris.CommandClient(
  process.env.TOKEN,
  {
    intents: Constants.Intents.all,
  },
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
  extra: {},
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

  // Register all imported commands
  bot.PB.slashCmds.forEach((cmd) => {
    bot.createGuildCommand(vars.chan, cmd.info);
    bot.PB.slashCmd[cmd.info.name] = cmd.cmd;
    console.log(`Registered /${cmd.info.name}`);
  });
});

bot.on("interactionCreate", (action) => {
  const { message, member } = action;
  // console.log(action, message);

  if (action instanceof Eris.ComponentInteraction) {
    const id = action.data.custom_id;
    const mem = bot.guilds.get(vars.chan).members.get(member.user.id);

    // Update message when passing to commands
    message.member = mem;
    message.author = mem.user;

    const user = `<@${member.user.id}>`;
    const langWarnings = [
        // Gotta repeat this one to get a different var in here >_>
        `Hey ${user}, I'd appreciate if you didn't use that sort of language in this community. I'm sure you will find more suitable vocabulary to express your thoughts clearly.`,
        `Hey ${user}, can we avoid that sort of language here? There's a slew of other ways to express yourself, I'm sure!`,
        `Excuse me ${user}, let's not speak like that here, please. Feel free to express yourself in more appropriate words!`,
        `Easy there ${user}, let's not use that kind of language in this community. There's probably a better way to phrase that.`,
      ],
      spamWarnings = [
        `Take it easy on the spam ${user}.`,
        `Hey ${user}, simmer down with all those keys please.`,
        `Oy ${user}, easy on the keyboard.`,
        `Calm down ${user}, no one likes the spam.`,
      ],
      behWarnings = [
        `I'd appreciate if you adjusted your behavior, ${user}.`,
        `C'mon ${user}, let's keep things proper around here.`,
        `That is not how to conduct yourself here ${user}, chill.`,
        `Calm down ${user}, let's keep things **civilized** around here.`,
      ];

    switch (id) {
      case "pbc-signup-v2":
        bot.PB.helpers.exeCmd("signup", { action, message });
        return true;
      case "mod_action_pls":
        // TODO - Log in modhistory

        bot.deleteMessage(action.channel.id, action.message.id);

        if (action.data.values[0] === "vulgar") {
          return bot.createMessage(bot.PB.extra.chan, {
            content:
              langWarnings[Math.floor(Math.random() * langWarnings.length)],
          });
        } else if (action.data.values[0] === "spam") {
          return bot.createMessage(bot.PB.extra.chan, {
            content:
              spamWarnings[Math.floor(Math.random() * spamWarnings.length)],
          });
        } else if (action.data.values[0] === "pill") {
          return bot.createMessage(bot.PB.extra.chan, {
            content:
              behWarnings[Math.floor(Math.random() * behWarnings.length)],
          });
        } else {
          return;
        }
    }

    bot.PB.extra = {};
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
