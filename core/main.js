const cron = require("node-cron");
const TwitchApi = require("node-twitch").default;
const dayjs = require("dayjs");

// Cross-post spam detection
// Same message in 2 different channels inside this window = crossposting
const CROSSPOST_WINDOW = 5000;
// Skip short chatter ("gg", "lfg", "congrats") - too many false positives
const CROSSPOST_MIN_LEN = 20;
// Don't re-mute/re-log the same user inside this cooldown
const FLAG_COOLDOWN = 5 * 60 * 1000;

// userID+normalized content -> { at, chanID, msg }
const crossposts = new Map();
// userID -> when we last flagged them
const flagged = new Map();

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

// Deletion is best-effort - a missing perm or an already-gone message
// should never take down the message handler.
function safeDelete(msg, reason) {
  if (!msg) return;
  Promise.resolve(msg.delete(reason)).catch((e) => {
    console.error(`Could not delete message: ${e.message}`);
  });
}

// Neutralize pings so echoed user content can't ping the mod channel
function sanitize(text) {
  return text
    .replace(/@(everyone|here)/gi, "@\u200b$1")
    .replace(/<@!?\d+>/g, (m) => m.replace("@", "@\u200b"))
    .replace(/<@&\d+>/g, (m) => m.replace("@", "@\u200b"));
}

// Flag a user who posts the exact same thing into two different channels
// within a few seconds - the classic cross-post ad/scam pattern.
function checkCrossPost(msg, bot) {
  const { vars } = bot.PB;

  // Attachment/embed-only posts have nothing to compare
  const content = msg.content?.trim().replace(/\s+/g, " ").toLowerCase();
  if (!content || content.length < CROSSPOST_MIN_LEN) return false;

  const userID = msg.author.id;
  const chanID = msg.channel.id;
  const now = Date.now();

  // Sweep stale entries so the maps don't grow forever
  for (const [key, post] of crossposts) {
    if (now - post.at > CROSSPOST_WINDOW) crossposts.delete(key);
  }
  for (const [id, at] of flagged) {
    if (now - at > FLAG_COOLDOWN) flagged.delete(id);
  }

  const key = `${userID}:${content}`;
  const prior = crossposts.get(key);
  crossposts.set(key, { at: now, chanID, msg });

  // First sighting, a repeat in the *same* channel, or too old - all fine
  if (!prior || prior.chanID === chanID) return false;
  if (now - prior.at > CROSSPOST_WINDOW) return false;

  // Already handled this user recently - don't stack mutes or log spam
  if (flagged.has(userID)) return false;
  flagged.set(userID, now);

  // Clear the cluster so a third copy doesn't re-trigger
  crossposts.delete(key);

  // Remove both copies
  safeDelete(prior.msg, "Identical message posted in another channel.");
  safeDelete(msg, "Identical message posted in another channel.");

  // Mod history
  bot
    .createMessage(vars.history, {
      content: `:warning: <@${userID}> looks suspicious...`,
      embed: {
        color: 0xffdc00,
        title: "Identical message posted in 2 channels",
        description: `> ${sanitize(content).slice(0, 200)}`,
        fields: [
          { name: "Against user:", value: `<@${userID}>`, inline: true },
          {
            name: "Channels:",
            value: `<#${prior.chanID}> and <#${chanID}>`,
            inline: true,
          },
        ],
        timestamp: new Date(),
      },
    })
    .catch(console.error);

  return module.exports.muteUser(msg, bot, "Cross-posted an identical message.");
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

    // Never moderate DMs
    if (!msg.channel.guild) return false;

    // Ignore self, matchbot, and any other bot
    if (msg.author.bot || msg.author.id === bot.user.id) return false;
    if (msg.author.id === vars.mbot) return false;

    if (process.env.LOCALTEST) return false;

    const speakerRoles = msg.member?.roles.length ? msg.member.roles : [];
    const minJoinedAgo = msg.author.createdAt
      ? Math.floor((Date.now() - msg.author.createdAt) / 1000 / 60)
      : 0;

    // Mods and devs cross-post announcements on purpose
    if (speakerRoles.includes(vars.mod) || speakerRoles.includes(vars.admin))
      return false;

    // For non-roled folks
    if (!speakerRoles.length) {
      // No Discord Sharing
      if (msg.content.includes("discord.gg/")) {
        safeDelete(msg, "Unroled user sharing Discord link.");
        bot
          .createMessage(
            msg.channel.id,
            ":warning: Unroled users may not share Discord servers, sorry."
          )
          .catch(console.error);
      }

      // Block Link sharing for an hour
      if (
        minJoinedAgo < 60 &&
        (msg.content.includes("http://") || msg.content.includes("https://"))
      ) {
        safeDelete(msg, "Brand new user sharing link.");
        bot
          .createMessage(
            msg.channel.id,
            "Unroled users may not share links so soon after joining."
          )
          .catch(console.error);
      }
    }

    return checkCrossPost(msg, bot);
  },
  async muteUser(msg, bot, warning, time = 2, admin = null) {
    const { vars } = bot.PB;

    // DMs are best-effort - closed DMs must not block the actual mute
    const private = await msg.author.getDMChannel().catch(() => null);
    const dm = (text) => private?.createMessage(text).catch(console.error);

    await msg.member.addRole(vars.muted, warning).catch((e) => {
      console.error(`Could not mute ${msg.author.username}: ${e.message}`);
    });

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
      dm(
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
      await msg.member
        .removeRole(vars.muted, "Mute has been lifted.")
        .catch(console.error);
      // PM
      dm(
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
