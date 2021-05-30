module.exports = (bot) => {
  const { 
    vars: x, 
    main, 
    helpers, 
    fb 
  } = bot.PB;

  bot.registerCommand("wip", async (msg) => {
    const total = await fb.getProp(msg.author.id, "currency");
    msg.channel.createMessage(`:bank: My records say you have **${total || "no"}** ${x.emojis.wip} coins`);
  }, {
    description: "Check the amount of WIP in your account"
  });

  // bot.registerCommand("transfer", async (msg) => {}, {
  //   description: "Transfers an amount of WIP to another user"
  // });

  // bot.registerCommand("give", async (msg) => {}, {
  //   description: "Admin only command to spur inflation of the WIP economy"
  // });

  return { 
    register() { console.info("Registered banking commands."); }
  };
};