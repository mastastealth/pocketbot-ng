const stripIndents = require("common-tags").stripIndents;

module.exports = (bot) => {
  const { vars: x } = bot.PB;

  const guides = [
    {
      name: ":eyes: The Basics of Scouting (2019)",
      value:
        "[Link to Kerpa's video on YT](https://www.youtube.com/watch?v=nitvji2PJGg)",
    },
    {
      name: ":crossed_swords: Basic Multiplayer Strategies (2018)",
      value:
        "[Link to EELuminatus' guide on Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=1586529908)",
      inline: true,
    },
  ];

  bot.registerCommand("troubleshoot", (msg, args) => {
    if (!args || !args[0]) {
      msg.channel.createMessage(stripIndents`
        What seems to be the trouble with your game? Type in '!troubleshoot #' by choosing an option below:
  
        :one: Unable to load \`mf.dll\`
        :two: Game is slow on laptop
        :three: Steam crashes
        :four: White screen of death
        :five: Out of Memory / W10 + AMD
        :five: Other`);
    } else {
      let k = args[0];
      let res;

      switch (k) {
        case ":one:":
        case "1":
        case "dll":
          res =
            "**Unable to load `mf.dll`**\nJust install the one matching your specific OS (and build): <https://support.microsoft.com/en-us/help/3145500/media-feature-pack-list-for-windows-n-editions>";
          break;
        case ":two:":
        case "2":
        case "igp":
          res =
            "**Game is slow on laptop**\nIt's possible your laptop is running TnT off of the integrated card instead of the GPU. Try manually setting the game's .exe to specifically use the dedicated card.";
          break;
        case ":three:":
        case "steam":
        case "3":
          res =
            "**Steam crashes**\nThis may be a problem with AVG or Avast. To play the game you can either temporarily disable the anti-virus program, or add `C:\\Program Files (x86)\\Steam\\steamapps\\common\\ToothAndTail\\` to the program's exemptions.";
          break;
        case ":four:":
        case "4":
        case "wsod":
          res =
            "**White screen of death**\nThere are a few things you can try: switch to integrated graphics, run in windowed mode, nuke your Options.xml file.";
          break;
        case ":five:":
        case "5":
          res =
            "Disable fullscreen optimizations as illustrated here: https://media.discordapp.net/attachments/134810918113509376/590269448896774144/unknown.png";
          break;
        case ":six:":
        case "6":
          res = `**Other**\nFor any other problems, ping <@${x.stealth}> in <#${x.trouble}>. :sweat_smile:`;
          break;
        case "files":
        case "folders":
        case "dir":
          res =
            "Windows: `%AppData%\\ToothAndTail\\`\nLinux/Mac: `~/.config/ToothAndTail/`\nLook for `Options.xml`, `log.html`, or the `replays` folder.";
          break;
      }

      msg.channel.createMessage(res);
    }
  });

  bot.registerCommand(
    "region",
    async (msg, args) => {
      if (args[0]) {
        let region = args[0].toLowerCase();

        if (region !== "na" && region !== "eu" && region !== "au") {
          msg.channel.createMessage(
            "🕑 You didn't specify a region. Please choose one of the following: `NA | EU | AU`",
            data
          );
        } else {
          try {
            await msg.member.addRole(x[region]);
            msg.channel.createMessage(
              `Successfully added to the ${region.toUpperCase()} role.`
            );
          } catch (e) {
            msg.channel.createMessage("🕑 Failed to role.");
            console.error(e);
          }
        }
      } else {
        msg.channel.createMessage(
          "🕑 You didn't specify a region. Please choose one of the following: `NA | EU | AU`"
        );
      }
    },
    {
      description:
        "Assign yourself one of 3 region roles for PBC access: NA | EU | AU",
    }
  );

  bot.PB.slashCmds.push({
    info: {
      name: "lfg",
      description: "Assign yourself a 'Looking for Game' role",
    },
    async cmd(action) {
      try {
        await action.member.addRole(x.lfg);
        return action.createMessage(
          `🕑 The world knows you are <@&${x.lfg}> now. Good luck.`
        );
      } catch (e) {
        console.error(e);
        return action.createMessage("🕑 Failed to add role.");
      }
    },
  });

  bot.PB.slashCmds.push({
    info: {
      name: "nolfg",
      description: "Unassign yourself the 'Looking for Game' role",
    },
    async cmd(action) {
      try {
        await action.member.removeRole(x.lfg);
        return action.createMessage(`🕑 ok bye.`);
      } catch (e) {
        console.error(e);
        return action.createMessage("🕑 Failed to remove role.");
      }
    },
  });

  bot.PB.slashCmds.push({
    info: {
      name: "dontask",
      description: "Something you shouldn't ask about...",
    },
    cmd(action) {
      return action.createMessage(
        "You shouldn't be asking about this. :eyes: <https://www.twitch.tv/toothandtailtv/clip/CarefulGlamorousWatercressRuleFive>"
      );
    },
  });

  bot.PB.slashCmds.push({
    info: {
      name: "guide",
      description: "Learn some TnT basics.",
    },
    cmd(action) {
      const fields = [];
      const embed = {
        title: "Guides",
        color: "8281503",
        description:
          "If you're new to the game, this is a great place to start and I hope by the end of this, you'll have a solid understanding of Tooth and Tail and be better equipped with knowledge to win your battles.",
        fields,
      };

      guides.forEach((g) => {
        fields.push(g);
      });

      return action.createMessage({ embed });
    },
  });

  bot.PB.slashCmds.push({
    info: {
      name: "controls",
      description: "Display game controls",
    },
    cmd(action) {
      return action.createMessage(
        ":video_game: These are the current controls: https://pocketwatchgames.com/presskit/Tooth%20and%20Tail/images/controllercscreen.png"
      );
    },
  });

  bot.PB.slashCmds.push({
    info: {
      name: "verify",
      description:
        "Posts a Steam link which automatically verifies the TnT directory",
    },
    cmd(action) {
      return action.createMessage(
        ":white_check_mark: Click here to verify your TnT files: http://toothandtailgame.com/verify"
      );
    },
  });

  bot.PB.slashCmds.push({
    info: {
      name: "8ball",
      description: "Seek the wisdom of PB.",
      options: [
        {
          name: "8ball",
          description: "Your question...",
          type: 3, // STRING
          required: true,
        },
      ],
    },
    cmd(action) {
      let n = Math.floor(Math.random() * 20 - 1),
        answer = [
          "It is certain",
          "It is decidedly so",
          "Without a doubt",
          "Yes, definitely",
          "As I see it, yes",
          "Most likely",
          "Outlook good",
          "Yes",
          "Signs point to yes",
          "Reply hazy try again",
          "Ask again later",
          "Better not tell you now",
          "Cannot predict now",
          "Concentrate and ask again",
          "Don't count on it",
          "My reply is no",
          "My sources say no",
          "Outlook not so good",
          "Very doubtful",
        ];

      return action.createMessage(
        `> ${action.data.options[0].value}\n\n:8ball: says _"${answer[n]}"_`
      );
    },
  });

  return {
    register() {
      console.info("Registered other commands.");
    },
  };
};
