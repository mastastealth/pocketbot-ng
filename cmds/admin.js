module.exports = (bot) => {
  const { vars: x, main, helpers } = bot.PB;

  bot.PB.slashCmds.push({
    info: {
      name: "say",
      description: "Allows admin to speak as PB",
      options: [
        {
          name: "channel",
          description: "Select a channel to speak in.",
          type: 7,
          required: true,
        },
        {
          name: "message",
          description: "Message you want to PB to repeat.",
          type: 3,
          required: true,
        },
      ],
    },
    cmd(action) {
      const [chanID, msg] = action.data.options;
      bot.createMessage(chanID.value, msg.value);
      return action.createMessage("PB said a thing.");
    },
  });

  bot.registerCommand(
    "rename",
    async (msg, args) => {
      if (!msg.mentions.length && args.length !== 2) {
        msg.channel.createMessage(
          "No user detected. Enter the user via an @ mention or by ID."
        );
        return false;
      }

      const target = msg.mentions.length
        ? await bot.guilds.get(x.chan).members.get(msg.mentions[0].id)
        : await bot.guilds.get(x.chan).members.get(args[0]);
      const prevName = target && target.nick ? target.nick : "N/A"; // Return current nickname of member

      if (target) {
        target.edit(
          {
            nick: args.slice(1).join(" "),
          },
          "Renamed user because his name probably sucked."
        );

        msg.delete();
        main.modEmbed({
          admin: msg.author,
          action: "rename",
          icon: ":crayon:",
          user: target.id,
          prevName,
          bot,
        });
      }
    },
    {
      description: "Allows mod/admin to rename a user",
      requirements: {
        custom(msg) {
          return helpers.hasModPerms(msg.member.roles);
        },
      },
    }
  );

  bot.registerCommand(
    "purge",
    async (msg, args) => {
      try {
        const messages = await msg.channel.getMessages({
          limit: parseInt(args[0]),
        });
        const mIDs = messages.map((m) => m.id);

        await bot.deleteMessages(
          msg.channel.id,
          mIDs,
          "Purging some stuff with bot."
        );
      } catch (e) {
        msg.channel.createMessage(`🕑 \`${e}\``);
      }
    },
    {
      description: "Delete a number of messages.",
      requirements: {
        custom(msg) {
          return helpers.hasModPerms(msg.member.roles);
        },
      },
    }
  );

  return {
    register() {
      console.info("Registered admin commands.");
    },
  };
};
