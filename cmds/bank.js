module.exports = (bot) => {
  const { vars: x, helpers, fb } = bot.PB;

  bot.PB.slashCmds.push({
    info: {
      name: "wip",
      description: "Check the amount of WIP in your account",
    },
    async cmd(action) {
      const total = await fb.getProp(action.member.id, "currency");
      action.createMessage(
        `My records say you have **${total || "no"}** ${x.emojis.wip} coins`
      );
    },
  });

  bot.PB.slashCmds.push({
    info: {
      name: "transfer",
      description: "Transfers an amount of WIP to another user",
      options: [
        {
          name: "user",
          description: "Who you want to transfer to.",
          type: 6,
          required: true,
        },
        {
          name: "amount",
          description: "How much you want to transfer.",
          type: 4,
          required: true,
        },
      ],
    },
    async cmd(action) {
      const who = helpers.getUser(action.data.options[0].value);
      const give = parseInt(action.data.options[1].value);

      if (give > 0) {
        const have = await fb.getProp(action.member.id, "currency");

        if (have && have >= give) {
          fb.setProp(who, "currency", give);
          fb.setProp(action.member.id, "currency", give * -1);
          return action.createMessage(
            `**${give}** ${x.emojis.wip} coins successfully transferred to <@${who}>.`
          );
        } else {
          return action.createMessage(
            `Transfer denied. Cannot give **${give}** ${x.emojis.wip} when you only have **${have}** ${x.emojis.wip}.`
          );
        }
      } else {
        return action.createMessage(
          "Transfer unsuccessful. Syntax is `!transfer @user N`."
        );
      }
    },
  });

  bot.registerCommand(
    "give",
    (msg, args) => {
      const give = parseInt(args[1]);

      if (args.length !== 2) {
        return msg.channel.createMessage(
          "Please tell me which `@user` you want to give `N` amount to..."
        );
      }

      if (give > 0) {
        fb.setProp(helpers.getUser(args[0]), "currency", give);
        msg.channel.createMessage(
          `**${give}** ${x.emojis.wip} coins successfully bestowed.`
        );
      } else {
        msg.channel.createMessage(
          "Give amount is not a number. Please learn your maths."
        );
      }
    },
    {
      description: "Admin only command to spur inflation of the WIP economy",
      requirements: {
        custom(msg) {
          return helpers.hasModPerms(msg.member.roles);
        },
      },
    }
  );

  return {
    register() {
      console.info("Registered banking commands.");
    },
  };
};
