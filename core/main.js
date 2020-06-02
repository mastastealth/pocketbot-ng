const cList = [];
const cMap = {};
const spammer = [];

module.exports = {
	countdown({ bot, msg, count, txt = false }) {
		const t = txt || msg.content;
		const chan = msg.channel.id;

		if (count > -1) {
			setTimeout(function() {
				if (t.includes("🕗")) { // 8 to 10
					bot.editMessage(chan, msg.id, t.replace("🕗","🕙"));
					module.exports.countdown({ bot, msg, count: count - 1, txt: t.replace("🕗","🕙") });
				}
				else if (t.includes("🕕")) { // 6 to 8
					bot.editMessage(chan, msg.id, t.replace("🕕","🕗"));
					module.exports.countdown({ bot, msg, count: count - 1, txt: t.replace("🕕","🕗") });
				}
				else if (t.includes("🕓")) { // 4 to 6
					bot.editMessage(chan, msg.id, t.replace("🕓","🕕"));
					module.exports.countdown({ bot, msg, count: count - 1, txt: t.replace("🕓","🕕") });
				}
				else if (t.includes("🕑")) { // 2 to 4
					bot.editMessage(chan, msg.id, t.replace("🕑","🕓"));
					module.exports.countdown({ bot, msg, count: count - 1, txt: t.replace("🕑","🕓") });
				} else { //10 to 12
					bot.editMessage(chan, msg.id, t.replace("🕙","💥"));
					module.exports.countdown({ bot, msg, count: count - 1, txt: t.replace("🕙","💥") });
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
			const speakerRoles = msg.member && msg.member.roles.length ? msg.member.roles : [];
			const minJoinedAgo = speaker && speaker.createdAt ? Math.floor( ((Date.now() - speaker.createdAt)/1000)/60 ) : 0;
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
				// if (!speakerRoles.includes(vars.mod) && !speakerRoles.includes(vars.admin)) {
					cList.push(userID);
				// }

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
						msg.delete('Brand new user sharing link.');
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
						const time = (speakerRoles.length) ? 30000 : 1000*60*2;
						setTimeout( function() {
							spammer.splice( spammer.indexOf(userID) , 1);
						}, time);

						// Cut channel messages in half to allow a response
						if (cMap[chanID].filter(u => u === userID).length === 4) {
							cMap[chanID].pop();
							cMap[chanID].pop();
						}

						cList.splice( cList.indexOf(userID) , 1);
						cList.splice( cList.indexOf(userID) , 1);

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
						cList.splice( cList.indexOf(userID) , 1);
						cList.splice( cList.indexOf(userID) , 1);
						cList.splice( cList.indexOf(userID) , 1);
					}
				} else if ((c > 4 && !speakerRoles.length) || (c > 6 && speakerRoles.length)) {
					bot.createMessage(`<@${userID}>, you are going to be muted for the next 2 minutes. Please adjust your chat etiquette.`);

					// Add them to mute role, and remove in 2 minutes
					module.exports.muteUser(msg, bot, "Too many consecutive messages.");

					// Clear out prev. spam counts
					cList.splice( cList.indexOf(userID) , 1);
					cList.splice( cList.indexOf(userID) , 1);
					cList.splice( cList.indexOf(userID) , 1);
					cList.splice( cList.indexOf(userID) , 1);
				}

				// Trim spam list every 2s
				setTimeout( function() {
					cList.splice( cList.indexOf(userID) , 1);
				}, 2000);
			}
		}
	},
	checkToxic(msg, bot) {
		// const toxic = require("./assets/bleep.json"),
		// 	tuser = bot.servers[vars.chan].members[userID],
		// 	uRoles = (tuser && tuser.hasOwnProperty("roles")) ? tuser.roles : [];

		// if (!uRoles.includes(vars.mod) && !uRoles.includes(vars.admin)) {
		// 	for (let x = 0; x < toxic.words.length; x += 1) {
		// 		if (message.toLowerCase().includes(toxic.words[x])) {
		// 			let embed = new helper.Embed({
		// 				author: {
		// 					name: "Language Detected"
		// 				},
		// 				color: 0xFFDC00,
		// 				description: `:speak_no_evil: <#${channelID}> | <@${userID}> said... \`\`\`${message}\`\`\`\n Should I issue a warning? \n ___`,
		// 				footer: {
		// 					text: "(React to this message with a thumbs up or down to warn or dismiss, respectively."
		// 				}
		// 			});

		// 			embed.fields = [
		// 				{
		// 					name: "Channel ID:",
		// 					value: channelID,
		// 					inline: true
		// 				},
		// 				{
		// 					name: "User ID:",
		// 					value: userID,
		// 					inline: true
		// 				}
		// 			];

		// 			dio.sendEmbed(embed, command_data, vars.modchan);
		// 			break;
		// 		}
		// 	}

		// 	for (let x = 0; x < toxic.nopes.length; x += 1) {
		// 		if (message.toLowerCase().includes(toxic.nopes[x])) {
		// 			dio.del( event.d.id, command_data);
		// 			dio.say(`<@${userID}>, you are going to be muted for the next 10 minutes and banned if you try that again.`, command_data);

		// 			helper.muteID({
		// 				data: command_data,
		// 				muteme: userID,
		// 				time: 10
		// 			});
		// 		}
		// 	}
		// }
	},
	muteUser(msg, bot, warning, time = 2, admin = null) {
		const { vars } = bot.PB;
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
			bot.createMessage(msg.author.id, `You have been muted for ${time} minutes because you were detected as spamming a channel. \n _If you weren't, and were wrongly flagged by the bot, please let a Moderator know. If you were, please try to use proper internet etiquette when engaging in chat._`);
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

		setTimeout(function() {
			msg.member.deleteRole(vars.muted);
			// PM
			bot.createMessage(msg.author.id, "You have now been unmuted. :tada: Please avoid any issues in the future. Constant mutes may result in strikes.");
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

		switch(e.action) {
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

		try { e.bot.createMessage(vars.history, { embed }); }
		catch(e) { console.error(e); }
	}
};