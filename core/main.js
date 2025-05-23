const cron = require("node-cron");
const TwitchApi = require("node-twitch").default;
const dayjs = require("dayjs");

const cList = [];
const cMap = {};
const spammer = [];

const watchList = [
  "19382657", //@andyschatz
  "111136741", //@PocketwatchG
  "3271155122", //@ToothAndTail
];

const twitch = new TwitchApi({
  client_id: process.env.TWITCHID,
  client_secret: process.env.TWITCHSECRET,
});

let pwgTwitch = null;

async function getStream() {
  const streams = await twitch.getStreams({ channel: "pocketwatch" });
  return streams?.data?.[0];
}

module.exports = {
  checkPresence(user, bot) {
    const game = user.game;
    const fromRoles = user.roles.length ? user.roles : [];
    const more = user.activities;
    const { vars: x } = bot.PB;

    if (process.env.LOCALTEST) return false;

    // Someone goes offline
    if (user.state === "offline") {
      // Check if they are on ready list
      if (fromRoles.includes(x.ptg))
        user.removeRole(x.ptg, "Went offline, removed PTG");
      if (fromRoles.includes(x.lfg))
        user.removeRole(x.lfg, "Went offline, removed LFG");
    }

    // Someone is playing/streaming (?) the game
    if (game) {
      let gameName = game.name.toLowerCase();
      // streamer = ( game.hasOwnProperty("url") ) ?  game.url.substr(game.url.lastIndexOf("/") + 1) : null;
      let otherJunk = more
        ? more.map((a) => {
            return a.name === "Tooth and Tail" ? "tnt" : false;
          })
        : [];

      // Check for all known game names and stream stuff
      if (
        gameName.match(/tooth\s?(and|&)\s?tail/gi) ||
        gameName.includes("tnt") ||
        otherJunk.includes("tnt")
      ) {
        // And if the user is roleless, or not a Recruit OR Veteran
        if (
          !fromRoles.length ||
          (!fromRoles.includes(x.noob) && !fromRoles.includes(x.member))
        )
          user.addRole(x.noob, "Add TnT fan to new player");
        // Add to PTG
        user.addRole(x.ptg, "Adding PTG");
      } else if (gameName.includes("monaco") || otherJunk.includes("monaco")) {
        if (
          !fromRoles.length ||
          (!fromRoles.includes(x.monacofan) && !fromRoles.includes(x.member))
        )
          user.addRole(x.monacofan, "Add monaco fan to new player");
        user.addRole(x.ptg, "Adding PTG");
      } else {
        // If he's not playing/streaming it, and has PTG, remove
        if (fromRoles.includes(x.ptg))
          user.removeRole(x.ptg, "Not playing, removed PTG");
      }
    } else {
      // Or if he stopped playing/streaming, remove PTG
      if (fromRoles.includes(x.ptg))
        user.removeRole(x.ptg, "Not playing, removed PTG");
    }
  },
  countdown({ bot, msg, count, txt = false }) {
    const t = txt || msg.content;
    const chan = msg.channel.id;
    if (count > -1) {
      setTimeout(function () {
        if (t.includes("🕗")) {
          // 8 to 10
          bot.editMessage(chan, msg.id, t.replace("🕗", "🕙"));
          module.exports.countdown({
            bot,
            msg,
            count: count - 1,
            txt: t.replace("🕗", "🕙"),
          });
        } else if (t.includes("🕕")) {
          // 6 to 8
          bot.editMessage(chan, msg.id, t.replace("🕕", "🕗"));
          module.exports.countdown({
            bot,
            msg,
            count: count - 1,
            txt: t.replace("🕕", "🕗"),
          });
        } else if (t.includes("🕓")) {
          // 4 to 6
          bot.editMessage(chan, msg.id, t.replace("🕓", "🕕"));
          module.exports.countdown({
            bot,
            msg,
            count: count - 1,
            txt: t.replace("🕓", "🕕"),
          });
        } else if (t.includes("🕑")) {
          // 2 to 4
          bot.editMessage(chan, msg.id, t.replace("🕑", "🕓"));
          module.exports.countdown({
            bot,
            msg,
            count: count - 1,
            txt: t.replace("🕑", "🕓"),
          });
        } else {
          //10 to 12
          bot.editMessage(chan, msg.id, t.replace("🕙", "💥"));
          module.exports.countdown({
            bot,
            msg,
            count: count - 1,
            txt: t.replace("🕙", "💥"),
          });
        }
      }, 2000);
    } else {
      // Now delete it
      bot.deleteMessage(chan, msg.id);
    }
  },
  checkSelf(msg, bot) {
    // If from Mastabot, check for timed message otherwise ignore
    if (msg.author.id === bot.user.id) {
      if (msg.content.includes("🕑")) {
        // Countsdown a message using clock emojis
        module.exports.countdown({ bot, msg, count: 5 });
      } else {
        // Check for tourney embed
        let tourneyEmbed =
          msg.embeds.length &&
          msg.embeds[0].author &&
          msg.embeds[0].author.name.startsWith("🏆");
        if (tourneyEmbed) msg.pin();
      }
    }
  },
  checkSpam(msg, bot) {
    const { vars } = bot.PB;

    // Ignore self/matchbot
    if (msg.author.id !== bot.user.id && msg.author.id !== vars.mbot) {
      const speaker = msg.author.id;
      const speakerRoles = msg.member?.roles.length ? msg.member.roles : [];
      const minJoinedAgo =
        speaker && msg.author.createdAt
          ? Math.floor((Date.now() - msg.author.createdAt) / 1000 / 60)
          : 0;
      const chanID = msg.channel.id;
      const userID = msg.author.id;

      // Ignore on debug, flip to true if need to test
      if (!process.env.LOCALTEST) {
        if (!speaker) return false; // Necessary?

        // Running user list of past 4 messages per channel
        if (!cMap[chanID]) cMap[chanID] = [];
        cMap[chanID].push(userID);
        if (cMap[chanID].length > 5) cMap[chanID].shift();

        // Ignore mods/devs
        if (
          !speakerRoles.includes(vars.mod) &&
          !speakerRoles.includes(vars.admin)
        ) {
          cList.push(userID);
        }

        // For non-roled folks
        if (!speakerRoles.length) {
          // No Discord Sharing
          if (msg.content.includes("discord.gg/")) {
            msg.delete("Unroled user sharing Discord link.");
            cList.push(userID);
            bot.createMessage(
              msg.channel.id,
              ":warning: Unroled users may not share Discord servers, sorry."
            );
          }

          // Block Link sharing for an hour
          if (
            minJoinedAgo < 60 &&
            (msg.content.includes("http://") ||
              msg.content.includes("https://"))
          ) {
            msg.delete("Brand new user sharing link.");
            cList.push(userID);
            bot.createMessage(
              msg.channel.id,
              "Unroled users may not share links so soon after joining."
            );
          }

          // Spoke 5 times straight w/o interruptions/replies
          if (cMap[chanID].filter((u) => u === userID).length >= 5) {
            // Instant warning
            cList.push(userID);
            cList.push(userID);
          }
        }

        let c = cList.filter((u) => userID).length; // Check how many messages user has posted recently

        // Trim spam list every 2s
        setTimeout(function () {
          cList.splice(cList.indexOf(userID), 1);
        }, 1700);
      }
    }
  },
  async muteUser(msg, bot, warning, time = 2, admin = null) {
    const { vars } = bot.PB;
    const private = await msg.author.getDMChannel();

    msg.member.addRole(vars.muted, warning);

    if (admin) {
      bot.createMessage(
        msg.author.id,
        `You have been muted for ${time} minutes because you were causing **some** sort of trouble in chat (harassing, questionable language, refusing mod/dev directions, etc.). \n _If you don't think you were, PM a Moderator or Mastastealth for details._`
      );
      bot.createMessage(
        msg.channel.id,
        `<@${admin}> muted <@${msg.author.id}> for ${time} minutes`
      );
      module.exports.modEmbed({
        admin,
        action: "mute",
        icon: ":zipper_mouth:",
        user: msg.author.id,
        muteLen: time,
        bot,
      });
    } else {
      // Automute
      private.createMessage(
        `You have been muted for ${time} minutes because you were detected as spamming a channel. \n _If you weren't, and were wrongly flagged by the bot, please let a Moderator know. If you were, please try to use proper internet etiquette when engaging in chat._`
      );
      bot.createMessage(
        msg.channel.id,
        `<@${msg.author.id}> has been muted for ${time} minutes`
      );
      module.exports.modEmbed({
        admin: "Pocketbot",
        action: "mute",
        icon: ":zipper_mouth:",
        user: msg.author.id,
        muteLen: time,
        bot,
      });
    }

    console.info(`Muted: ${msg.author.username} | ${msg.author.id}`);

    setTimeout(async () => {
      msg.member.removeRole(vars.muted, "Mute has been lifted.");
      // PM
      private.createMessage(
        "You have now been unmuted. :tada: Please avoid any issues in the future. Constant mutes may result in strikes."
      );
      // Community
      bot.createMessage(
        msg.channel.id,
        `<@${msg.author.id}> is no longer muted`
      );
      // Console
      console.info(`Unmuted: ${msg.author.username} | ${msg.author.id}`);
    }, 1000 * 60 * time);
  },
  modEmbed(e) {
    const { vars } = e.bot.PB;
    const embed = {
      timestamp: new Date(),
    };

    embed.fields = [
      {
        name: "Against user:",
        value: `<@${e.user}>`,
        inline: true,
      },
    ];

    switch (e.action) {
      case "strike":
        embed.color = 0xff4136;
        embed.description = `${e.icon} - **${e.admin}** issued a **strike**.`;
        embed.fields.push({
          name: "Count:",
          value: e.strikeCount,
          inline: true,
        });

        if (e.strikeCount == 3) {
          embed.fields.push({
            name: "BANNED:",
            value: ":white_check_mark:",
            inline: true,
          });
        }
        break;
      case "mute":
        embed.color = 0xff851b;
        embed.description = `${e.icon} - **${e.admin}** issued a **mute**.`;
        embed.fields.push({
          name: "Length in Min:",
          value: e.muteLen,
          inline: true,
        });
        break;
      case "warn":
        (embed.color = 0xffdc00),
          (embed.description = `${e.icon} - **${e.admin}** issued a **warning**.`);
        embed.fields.push({
          name: "Comment:",
          value: e.msg,
        });
        break;
      case "rename":
        embed.color = 0xb10dc9;
        embed.description = `${e.icon} - **${e.admin}** has **renamed** a user.`;
        embed.fields.push({
          name: "Formerly:",
          value: e.prevName,
          inline: true,
        });
        break;
      case "log":
        embed.color = 0x39cccc;
        embed.description = `${e.icon} - **${e.admin}** has **logged an action**.`;
        break;
    }

    if (e.chanID)
      embed.fields.push({
        name: "ChannelID",
        value: `<#${e.chanID}>`,
      });

    try {
      e.bot.createMessage(vars.history, { embed });
    } catch (e) {
      console.error(e);
    }
  },
  pbcCron(bot) {
    let tourneyHrs = [12, 17, 22];
    const { vars, helpers } = bot.PB;

    // Check if PWG is streaming
    cron.schedule("0 */10 * * * 1-5", async function () {
      if (!pwgTwitch) {
        pwgTwitch = await getStream();

        if (pwgTwitch?.user_login === "pocketwatch") {
          const now = new dayjs();
          const streamStart = new dayjs(pwgTwitch.started_at);
          const since = now.diff(streamStart, "m");

          const embed = {
            title: `${
              streamStart.hour() < 17 ? vars.emojis.joe : vars.emojis.schatz
            } Time to stream some **game development**!`,
            url: "https://www.twitch.tv/pocketwatch",
            color: 0x7708d7,
            description: `Today's stream: **${pwgTwitch.title}**`,
            thumbnail: {
              url: "https://static-cdn.jtvnw.net/jtv_user_pictures/4014faac-fcbf-47fd-afa3-5d843052db64-profile_image-70x70.png",
            },
          };

          if (since < 16) bot.createMessage(vars.house, { content: `<@&${vars.streamfan}>`, embed });

          setTimeout(() => {
            pwgTwitch = null;
          }, 1000 * 60 * 60 * 4); // Clear stream after 4 hours
        }
      }
    });

    // Schedule a new PBC cup
    cron.schedule(
      `0 0 ${tourneyHrs[0]},${tourneyHrs[1]},${tourneyHrs[2]} * * 1`,
      function () {
        console.log("Creating Cup.", "OK");
        helpers.exeCmd("makecup");

        const time = new Date();
        let who = vars.au;
        if (time.getHours() === tourneyHrs[1]) who = vars.eu;
        if (time.getHours() === tourneyHrs[2]) who = vars.na;

        bot.createMessage(
          vars.memchan,
          `Attention <@&${vars.ptg}>, <@&${who}>, or those <@&${vars.lfg}>, a new Pocketbot Cup has just opened signups in <#${vars.pbcup}>!`
        );
      }
    );

    cron.schedule(
      `0 45 ${tourneyHrs[0]},${tourneyHrs[1]},${tourneyHrs[2]} * * 1`,
      function () {
        console.log("Reminding about Cup.", "OK");
        helpers.exeCmd("signoutremind");

        bot.createMessage(
          vars.memchan,
          `For anyone <@&${vars.ptg}> or <@&${vars.lfg}>, there is a Pocketbot Cup currently open for signups, it starts in 15 minutes over in <#${vars.pbcup}>. Go win some ${vars.emojis.wip}!`
        );
      }
    );

    cron.schedule(
      `59 59 ${tourneyHrs[0]},${tourneyHrs[1]},${tourneyHrs[2]} * * 1`,
      function () {
        console.log("Starting Cup.", "OK");
        helpers.exeCmd("startcup");
      }
    );
  },
};
