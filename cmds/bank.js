module.exports = (bot) => {
  const { 
    vars: x, 
    // main, 
    helpers, 
    fb 
  } = bot.PB;

  bot.registerCommand("wip", async (msg) => {
    const total = await fb.getProp(msg.author.id, "currency");
    msg.channel.createMessage(`My records say you have **${total || "no"}** ${x.emojis.wip} coins`);
  }, {
    description: "Check the amount of WIP in your account"
  });

  bot.registerCommand("transfer", async (msg, args) => {
    const who = helpers.getUser(args[0]);
    const give = parseInt(args[1]);

    if (args.length !== 2) {
      return msg.channel.createMessage('Please tell me which `@user` you want to transfer `N` amount to...');
    }

    if (give > 0) {
      fb.setProp(helpers.getUser(args[0]), "currency", give);
      fb.setProp(msg.author.id, "currency", give * -1);
      msg.channel.createMessage(`**${give}** ${x.emojis.wip} coins successfully transferred.`);
    } else {
      msg.channel.createMessage('Transfer unsuccessful. Syntax is `!transfer @user N`.');
    }
  }, {
    description: "Transfers an amount of WIP to another user"
  });

  bot.registerCommand("give", (msg, args) => {
    const give = parseInt(args[1]);

    if (args.length !== 2) {
      return msg.channel.createMessage('Please tell me which `@user` you want to give `N` amount to...');
    }

    if (give > 0) {
      fb.setProp(helpers.getUser(args[0]), "currency", give);
      msg.channel.createMessage(`**${give}** ${x.emojis.wip} coins successfully bestowed.`);
    } else {
      msg.channel.createMessage('Give amount is not a number. Please learn your maths.');
    }
  }, {
    description: "Admin only command to spur inflation of the WIP economy",
    requirements: {
      custom(msg) {
        return helpers.hasModPerms(msg.member.roles);
      }
    }
  });

  return { 
    register() { console.info("Registered banking commands."); }
  };
};