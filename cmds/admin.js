module.exports = (bot) => {
  const { vars: x, main, helpers } = bot.PB;

  bot.registerCommand("say", (msg) => {
    bot.createMessage(x.chan, msg.content.replace("!say ", ""));
  }, {
    description: "Allows admin to speak as PB",
    requirements: {
      roleIDs: [x.admin]
    }
  });

  // Mod/Admin can rename a user
  bot.registerCommand("rename", async (msg, args) => {
    if (!msg.mentions.length && args.length !== 2) {
      msg.channel.createMessage("No user detected. Enter the user via an @ mention or by ID.");
      return false;
    }

    const target = msg.mentions.length 
      ? await bot.guilds.get(x.chan).members.get(msg.mentions[0].id) 
      : await bot.guilds.get(x.chan).members.get(args[0]);
    const prevName = target && target.nick ? target.nick : "N/A"; // Return current nickname of member

    if (target) {
      target.edit({
        nick: args.slice(1).join(" ")
      }, "Renamed user because his name probably sucked.");
  
      msg.delete();
      main.modEmbed({
        admin: msg.author,
        action: "rename",
        icon: ":crayon:",
        user: target.id,
        prevName,
        bot
      });
    }
  }, {
    requirements: {
      description: "Allows mod/admin to rename a user",
      roleIDs: [x.admin, x.mod]
    }
  });

  bot.registerCommand("purge", async (msg, args) => {
    const messages = await msg.channel.getMessages({ limit: parseInt(args[0]) });
    const mIDs = messages.map(m => m.id);
  
    bot.deleteMessages(msg.channel.id, mIDs, "Purging some stuff with bot.");
  }, {
    description: "Delete a number of messages.",
    requirements: {
      custom(msg) {
        return helpers.hasModPerms(msg.member.roles);
      }
    }
  });

  return { 
    register() { console.info("Registered admin commands."); }
  };
};