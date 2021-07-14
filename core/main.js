const cron = require("node-cron");
const T = require("twit");

const cList = [];
const cMap = {};
const spammer = [];

const twitter = new T({
	consumer_key: process.env.TWITKEY,
	consumer_secret: process.env.TWITTOKEN,
	access_token: process.env.TWITATOKEN,
	access_token_secret: process.env.TWITSECRET
});
const watchList = [
	"19382657", //@andyschatz
	"111136741", //@PocketwatchG
	"3271155122" //@ToothAndTail
];
const stream = process.env.LOCALTEST ? null : twitter.stream("statuses/filter", { follow: watchList });

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
			if (fromRoles.includes(x.lfg)) user.removeRole(x.lfg, "Went offline, removed LFG");
		}

		// Someone is playing/streaming (?) the game
		if (game) {
			let gameName = game.name.toLowerCase();
			// streamer = ( game.hasOwnProperty("url") ) ?  game.url.substr(game.url.lastIndexOf("/") + 1) : null;
			let otherJunk = (more) ? more.map((a) => { return a.name === "Tooth and Tail" ? "tnt" : false; }) : [];

			// Check for all known game names and stream stuff 
			if (gameName.match(/tooth\s?(and|&)\s?tail/gi) || gameName.includes("tnt") || otherJunk.includes("tnt")) {
				// And if the user is roleless, or not a Recruit OR Veteran
				if (
					!fromRoles.length
					|| (!fromRoles.includes(x.noob) && !fromRoles.includes(x.member))
				) user.addRole(x.noob, "Add recruit to new player");
				// Add to LFG
				user.addRole(x.lfg, "Went offline, removed LFG");

			} else {
				// If he's not playing/streaming it, and has LFG, remove
				if (fromRoles.includes(x.lfg)) user.removeRole(x.lfg, "Not playing TnT, removed LFG");
			}
		} else {
			// Or if he stopped playing/streaming, remove LFG
			if (fromRoles.includes(x.lfg)) user.removeRole(x.lfg, "Not playing TnT, removed LFG");
		}
	},
	countdown({ bot, msg, count, txt = false }) {
		const t = txt || msg.content;
		const chan = msg.channel.id;

		if (count > -1) {
			setTimeout(function () {
				if (t.includes("🕗")) { // 8 to 10
					bot.editMessage(chan, msg.id, t.replace("🕗", "🕙"));
					module.exports.countdown({ bot, msg, count: count - 1, txt: t.replace("🕗", "🕙") });
				}
				else if (t.includes("🕕")) { // 6 to 8
					bot.editMessage(chan, msg.id, t.replace("🕕", "🕗"));
					module.exports.countdown({ bot, msg, count: count - 1, txt: t.replace("🕕", "🕗") });
				}
				else if (t.includes("🕓")) { // 4 to 6
					bot.editMessage(chan, msg.id, t.replace("🕓", "🕕"));
					module.exports.countdown({ bot, msg, count: count - 1, txt: t.replace("🕓", "🕕") });
				}
				else if (t.includes("🕑")) { // 2 to 4
					bot.editMessage(chan, msg.id, t.replace("🕑", "🕓"));
					module.exports.countdown({ bot, msg, count: count - 1, txt: t.replace("🕑", "🕓") });
				} else { //10 to 12
					bot.editMessage(chan, msg.id, t.replace("🕙", "💥"));
					module.exports.countdown({ bot, msg, count: count - 1, txt: t.replace("🕙", "💥") });
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
				let tourneyEmbed = msg.embeds.length && msg.embeds[0].author && msg.embeds[0].author.name.startsWith("🏆");
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
			const minJoinedAgo = speaker && msg.author.createdAt ? Math.floor(((Date.now() - msg.author.createdAt) / 1000) / 60) : 0;
			const chanID = msg.channel.id;
			const userID = msg.author.id;

			// Ignore on debug, flip to true if need to test
			if (!process.env.LOCALTEST) {
				if (!speaker) return false; // Necessary??

				// Running user list of past 4 messages per channel
				if (!cMap[chanID]) cMap[chanID] = [];
				cMap[chanID].push(userID);
				if (cMap[chanID].length > 5) cMap[chanID].shift();

				// Ignore mods/devs
				if (!speakerRoles.includes(vars.mod) && !speakerRoles.includes(vars.admin)) {
				  cList.push(userID);
				}

				// For non-roled folks
				if (!speakerRoles.length) {

					// No Discord Sharing
					if (msg.content.includes("discord.gg/")) {
						msg.delete("Unroled user sharing Discord link.");
						cList.push(userID);
						bot.createMessage(msg.channel.id, ":warning: Unroled users may not share Discord servers, sorry.");
					}

					// Block Link sharing for an hour
					if (minJoinedAgo < 60 && (msg.content.includes("http://") || msg.content.includes("https://"))) {
						msg.delete("Brand new user sharing link.");
						cList.push(userID);
						bot.createMessage(msg.channel.id, "Unroled users may not share links so soon after joining.");
					}

					// Spoke 5 times straight w/o interruptions/replies
					if (cMap[chanID].filter(u => u === userID).length >= 5) {
						// Instant warning
						cList.push(userID);
						cList.push(userID);
					}
				}

				let c = cList.filter(u => userID).length; // Check how many messages user has posted recently

				if (c === 3) {
					if (!spammer.includes(userID)) {
						// Record warning, auto delete after 2 min. for noobs, 30s for roled
						spammer.push(userID);
						const time = (speakerRoles.length) ? 30000 : 1000 * 60 * 2;
						setTimeout(function () {
							spammer.splice(spammer.indexOf(userID), 1);
						}, time);

						// Cut channel messages in half to allow a response
						if (cMap[chanID].filter(u => u === userID).length === 4) {
							cMap[chanID].pop();
							cMap[chanID].pop();
						}

						cList.splice(cList.indexOf(userID), 1);
						cList.splice(cList.indexOf(userID), 1);

						// Warning
						const v = [
							`Take it easy on the keyboard <@${userID}>. :open_hands: `,
							`<@${userID}> shift + enter is your friend!`,
							`<@${userID}> take a chill pill. :pill:`,
							`Calm down <@${userID}>, typing isn't a race. :smirk:`
						];
						const n = Math.floor(Math.random() * 4);

						bot.createMessage(msg.channel.id, v[n]);
					} else { // 2nd warning = automute
						module.exports.muteUser(msg, bot, "Did not heed spam warning.");

						// Clear out prev. spam counts
						cList.splice(cList.indexOf(userID), 1);
						cList.splice(cList.indexOf(userID), 1);
						cList.splice(cList.indexOf(userID), 1);
					}
				} else if ((c > 4 && !speakerRoles.length) || (c > 6 && speakerRoles.length)) {
					bot.createMessage(`<@${userID}>, you are going to be muted for the next 2 minutes. Please adjust your chat etiquette.`);

					// Add them to mute role, and remove in 2 minutes
					module.exports.muteUser(msg, bot, "Too many consecutive messages.");

					// Clear out prev. spam counts
					cList.splice(cList.indexOf(userID), 1);
					cList.splice(cList.indexOf(userID), 1);
					cList.splice(cList.indexOf(userID), 1);
					cList.splice(cList.indexOf(userID), 1);
				}

				// Trim spam list every 2s
				setTimeout(function () {
					cList.splice(cList.indexOf(userID), 1);
				}, 2000);
			}
		}
	},
	checkToxic(msg, bot) {
		const toxic = require("../assets/bleep.json");
		const tuser = msg.author.id;
		const uRoles = msg.member && msg.member.roles.length ? msg.member.roles : [];
		const { vars } = bot.PB;

		// Admins/mods are trusted not to be idiots
		if (!uRoles.includes(vars.mod) && !uRoles.includes(vars.admin)) {
			for (let x = 0; x < toxic.words.length; x += 1) {
				if (msg.content.toLowerCase().includes(toxic.words[x])) {
					const embed = {
						author: {
							name: "Language Detected"
						},
						color: 0xFFDC00,
						description: `:speak_no_evil: <#${msg.channel.id}> | <@${tuser}> said... \`\`\`${msg.content}\`\`\`\n Should I issue a warning? \n ___`,
						footer: {
							text: "(React to this message with a thumbs up or down to warn or dismiss, respectively."
						}
					};

					embed.fields = [
						{
							name: "Channel ID:",
							value: msg.channel.id,
							inline: true
						},
						{
							name: "User ID:",
							value: tuser,
							inline: true
						}
					];

					bot.createMessage(vars.modchan, { embed });
					break;
				}
			}

			for (let x = 0; x < toxic.nopes.length; x += 1) {
				if (msg.content.toLowerCase().includes(toxic.nopes[x])) {
					msg.delete();
					bot.createMessage(msg.channel.id, `<@${tuser}>, you are going to be muted for the next 10 minutes and banned if you try that again.`);
					module.exports.muteUser(msg, bot, "Toxic language.", 10);
				}
			}
		}
	},
	async muteUser(msg, bot, warning, time = 2, admin = null) {
		const { vars } = bot.PB;
    const private = await msg.author.getDMChannel();

		msg.member.addRole(vars.muted, warning);

		if (admin) {
			bot.createMessage(msg.author.id, `You have been muted for ${time} minutes because you were causing **some** sort of trouble in chat (harassing, questionable language, refusing mod/dev directions, etc.). \n _If you don't think you were, PM a Moderator or Mastastealth for details._`);
			bot.createMessage(msg.channel.id, `<@${admin}> muted <@${msg.author.id}> for ${time} minutes`);
			module.exports.modEmbed({
				admin,
				action: "mute",
				icon: ":zipper_mouth:",
				user: msg.author.id,
				muteLen: time,
				bot
			});
		} else { // Automute
			private.createMessage(`You have been muted for ${time} minutes because you were detected as spamming a channel. \n _If you weren't, and were wrongly flagged by the bot, please let a Moderator know. If you were, please try to use proper internet etiquette when engaging in chat._`);
			bot.createMessage(msg.channel.id, `<@${msg.author.id}> has been muted for ${time} minutes`);
			module.exports.modEmbed({
				admin: "Pocketbot",
				action: "mute",
				icon: ":zipper_mouth:",
				user: msg.author.id,
				muteLen: time,
				bot
			});
		}

		console.info(`Muted: ${msg.author.username} | ${msg.author.id}`);

		setTimeout(async () => {
			msg.member.removeRole(vars.muted, "Mute has been lifted.");
			// PM
			private.createMessage("You have now been unmuted. :tada: Please avoid any issues in the future. Constant mutes may result in strikes.");
			// Community
			bot.createMessage(msg.channel.id, `<@${msg.author.id}> is no longer muted`);
			// Console
			console.info(`Unmuted: ${msg.author.username} | ${msg.author.id}`);
		}, 1000 * 60 * time);
	},
	modEmbed(e) {
		const { vars } = e.bot.PB;
		const embed = {
			timestamp: new Date()
		};

		embed.fields = [
			{
				name: "Against user:",
				value: `<@${e.user}>`,
				inline: true
			}
		];

		switch (e.action) {
			case "strike":
				embed.color = 0xFF4136;
				embed.description = `${e.icon} - **${e.admin}** issued a **strike**.`;
				embed.fields.push({
					name: "Count:",
					value: e.strikeCount,
					inline: true
				});

				if (e.strikeCount == 3) {
					embed.fields.push({
						name: "BANNED:",
						value: ":white_check_mark:",
						inline: true
					});
				}
				break;
			case "mute":
				embed.color = 0xFF851B;
				embed.description = `${e.icon} - **${e.admin}** issued a **mute**.`;
				embed.fields.push({
					name: "Length in Min:",
					value: e.muteLen,
					inline: true
				});
				break;
			case "warn":
				embed.color = 0xFFDC00,
					embed.description = `${e.icon} - **${e.admin}** issued a **warning**.`;
				embed.fields.push({
					name: "Comment:",
					value: e.msg
				});
				break;
			case "rename":
				embed.color = 0xB10DC9;
				embed.description = `${e.icon} - **${e.admin}** has **renamed** a user.`;
				embed.fields.push({
					name: "Formerly:",
					value: e.prevName,
					inline: true
				});
				break;
			case "log":
				embed.color = 0x39CCCC;
				embed.description = `${e.icon} - **${e.admin}** has **logged an action**.`;
				break;
		}

		if (e.chanID) embed.fields.push({
			name: "ChannelID",
			value: `<#${e.chanID}>`
		});

		try {
			e.bot.createMessage(vars.history, { embed });
		} catch (e) {
			console.error(e);
		}
	},
	pbcCron(bot) {
		let tourneyHrs = [13, 17, 22];
		const { vars } = bot.PB;

		cron.schedule(`0 0 ${tourneyHrs[0]},${tourneyHrs[1]},${tourneyHrs[2]} * * 1`, function () {
			console.log("Creating Cup.", "OK");
			const cmd = Object.values(bot.commands).filter(cmd => cmd.label.includes("makecup"))[0];
			cmd.execute(null, null, { client: bot });

			const time = new Date();
			let who = vars.au;
			if (time.getHours() === tourneyHrs[1]) who = vars.eu;
			if (time.getHours() === tourneyHrs[2]) who = vars.na;

			bot.createMessage(vars.memchan, `Attention <@&${vars.lfg}>, <@&${who}>, or those wanting to, a new Pocketbot Cup has just opened signups in <#${vars.pbcup}>!`);
		});

		cron.schedule(`0 45 ${tourneyHrs[0]},${tourneyHrs[1]},${tourneyHrs[2]} * * 1`, function () {
			console.log("Reminding about Cup.", "OK");
			const cmd = Object.values(bot.commands).filter(cmd => cmd.label.includes("signoutremind"))[0];
			cmd.execute(null, null, { client: bot });

			bot.createMessage(vars.memchan, `For anyone <@&${vars.lfg}> or just hanging around, there is a Pocketbot Cup currently open for signups, it starts in 15 minutes over in <#${vars.pbcup}>. Go win some ${vars.emojis.wip}!`);
		});

		cron.schedule(`59 59 ${tourneyHrs[0]},${tourneyHrs[1]},${tourneyHrs[2]} * * 1`, function () {
			console.log("Starting Cup.", "OK");
			const cmd = Object.values(bot.commands).filter(cmd => cmd.label.includes("startcup"))[0];
			cmd.execute(null, null, { client: bot });
		});
	},
	lucille(bot) {
		const { vars: x } = bot.PB;
		if (!stream) return false;

		stream.on("tweet", function (tweet) {
			//If Tracked User
			if (
				watchList.includes(tweet.user.id_str)
				&& tweet.in_reply_to_status_id === null
			) {
				const lT = {
					user: tweet.user.screen_name,
					uid: tweet.user.id,
					tweet: tweet.text,
					id: tweet.id_str
				};
				let face = "";

				console.log(`${lT.user} | ${lT.uid} tweeted.`);

				switch (lT.uid) {
					case 19382657:
						face = x.emojis.schatz;
						break;
					case 3271155122:
						face = x.emojis.hopper;
						break;
				}

				// Change channel if TnT
				let chan = (lT.uid == 3271155122) ? x.memchan : x.chan;
				bot.createMessage(
					chan,
					`${face} **@${lT.user} just tweeted**:\n http://twitter.com/${lT.user}/status/${lT.id}`
				);
			}
		});
	}
};
