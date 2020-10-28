const challonge = require("challonge-node-ng");
const stripIndents = require("common-tags").stripIndents;

module.exports = (bot) => {
	const x = bot.PB.vars;
	const client = challonge.withAPIKey(process.env.CHALLONGE);

	let currentTourney = null;
	let tNum = null;
	let tPlayers = {};
	let tRound = null;
	let tCount = 0;
	let tourneyChan = (process.env.LOCALTEST) ? x.testing : x.pbcup;

	// In case of reset/crash mid tourney, look for any open PB tournaments and set all the data from there
	async function resumeTourney() {
		try {
			const tournies = await client.tournaments.index({ "subdomain": "pocketbotcup" });
			const openT = tournies.filter( t => t.state !== "complete");
	
			if (openT[0]) {
				// Set ID and count
				currentTourney = openT[0].id;
				tNum = tournies.length;
	
				// Let's get back the participant/round data
				let tData = await getTourneyData();
	
				tData.participants.forEach(obj => tPlayers[obj.participant.misc] = obj.participant.id);
				tCount = Object.keys(tPlayers).length;
	
				let earlyMatch = tData.matches.map(obj => obj.match)
						.filter( match => match.state === "open"),
					completeMatches = tData.matches.map(obj => obj.match)
						.filter( match => match.state === "complete");
	
				tRound = (earlyMatch[0]) ? earlyMatch[0].round : 1; // If we got back an open match, first should contain earliest round
	
				if (tRound === 3) {
					tRound = (earlyMatch[earlyMatch.length-1].round === 0) ? tRound : 4; // Unless of course Round 0 (which is the bronze match), is hiding at the end
				}
	
				if (tData.matches.length === completeMatches.length) tRound = 4; // If ALL matches are done, set to final round
	
				console.log(`Found existing tournament: ${currentTourney} | Now resuming from Round ${tRound} with ${tCount} players.`, "OK");
			}
		} catch(e) {
			console.error(e);
		}
	}

	// Retrieves tourney data with participants and matches as well
	function getTourneyData(id = currentTourney) {
		return client.tournaments.show(id, { "include_participants" : 1, "include_matches" : 1 });
	}

	// This will create the tournament in Challonge
	async function makeTourney() {
		try {
			const cups = await client.tournaments.index({ "subdomain": "pocketbotcup" });
			tNum = cups.length + 1;

			const tournament = await client.tournaments.create({
				"tournament": {
					"name": `Pocketbot Cup #${tNum}`,
					"url": `pocketbotcup_${tNum}`,
					"subdomain": "pocketbotcup",
					"description": "Welcome to the new and fully automated <strong>Pocketbot Cup</strong>! This is a weekly cup run by Pocketbot every Monday to let players enjoy a small dose of competition, while helping analyze replay data with the latest patch. If you have any questions or suggestions, talk to Mastastealth on the <a href='http://discord.gg/pockwatch'>PWG Discord</a>.",
					"hold_third_place_match": true,
					"accept_attachments": true,
					"signup_cap": 16,
					"start_at": new Date(Date.now() + (60 * 60 * 1000)), // Start in 1h
					"show_rounds": true,
					"game_id" : 54849,
					"game_name": "Tooth and Tail",
					"check_in_duration": 20 // minutes
				}
			});

			console.log(`Created tournament: ${tournament.id}`);
			currentTourney = tournament.id;

			// PB announces it
			bot.say(tourneyChan, `:trophy: A new Pocketbot Cup has begun! Follow it on Challonge here: http://pocketbotcup.challonge.com/pocketbotcup_${tNum} \n\n There are 16 slots available. Tournament starts in 1 hour, check-ins open 15 minutes prior to start.`);
		} catch(e) {
			console.error(e);
		}
	}

	// Process check-ins and commence tournament
	async function startTourney({ msg, args }, tid = null) {
		// If we got a manual ID, use that, otherwise default
		const tChan = (tid) ? x.tourney : tourneyChan;
		const cTourneyScoped = (tid) ? tid : currentTourney;

		// If a normal user called this without a custom tournament, fail
		const u = msg.member;
		const uRoles = (u && u.roles.length) ? u.roles : [];

		if (
			!tid && (
				!uRoles.includes(x.mod) 
				&& !uRoles.includes(x.admin) 
				&& !uRoles.includes(x.adminbot)
			)
		) {
			msg.channel.createMessage("🕑 Are you trying to start a Pocketbot Cup? Don't do that.");
			return false;
		}

		if (
			(!tid && tCount >= 4) // PB Cup with 4+ player
			|| tid // or custom tourney
		) {
			try {
				if (!tid) await client.tournaments.proc_checkin(cTourneyScoped); // Don't process checkins for custom tournies
				if (tid && args[1] && args[1].startsWith("shuffle")) await client.participants.randomize(cTourneyScoped);

				await client.tournaments.start(cTourneyScoped); // Start tourney
				const cTourney = await getTourneyData(cTourneyScoped);

				// Create dictionary with "Challonge User ID : Discord User ID" pairs
				const cPlayers = {};
				cTourney.participants.forEach( (obj) => {
					cPlayers[obj.participant.id] = (obj.participant.misc) ? obj.participant.misc : 0;
				});

				// Find all round 1 matches and return vs. strings with <@user> pings
				const cMatches = cTourney.matches
					.map(obj => obj.match)
					.filter( match => match.state === "open" && match.round === 1)
					.map( match => {
						return `:regional_indicator_${match.identifier.toLowerCase()}: <@${cPlayers[match.player1_id]}> vs. <@${cPlayers[match.player2_id]}>`;
					});

				bot.createMessage(tChan, stripIndents`${(!tid) ? "Processed all players who checked in. " : ""}**Let the games begin! :mega:**

				Round 1 Matches :crossed_swords::
				${cMatches.join("\n")}

				**Reminder**: You **will** need to submit replays to log your scores, so make sure to save 'em! :floppy_disk:${(!tid) ? "Matches are **best of 3**." : ""}`);

				tRound = 1; // Start round 1

				if (tid) {
					currentTourney = tid;
					return false; // No role cleanup on custom tournies
				}

				// Remove all the people with Competitor who AREN'T playing
				const cPlaying = cTourney.participants
					.map(obj => obj.match)
					.filter( player => player && player.seed > 8);

				Object.values(cPlaying).forEach((p, i) => {
					setTimeout(async () => {
						const member = await bot.guilds.get(x.chan).members.get(p.misc);
						if (member) member.deleteRole(x.competitor);
					}, (i + 1) * 600);
				});

			} catch (err) {
				console.error(err);
				bot.createMessage(tChan, "Couldn't start tournament, check console for errors.");
			}
		} else {
			try {
				await client.tournaments.destroy(cTourneyScoped);
				bot.createMessage(tChan, "Not enough participants entered the tournament this week, so it will be cancelled. :frowning: Gather some more folks for next week!");
				resetTourneyVars();
			} catch (err) {
				console.error(err);
				bot.createMessage(tChan, "Couldn't destroy tournament, check console for errors.");
			}
		}
	}

	// Wraps up a tournament
	async function finishTourney(tid) {
		const tourney = tid || currentTourney;
		const notPBCup = (Object.keys(tPlayers).length > 0) ? false : true;
		const tChan = notPBCup ? x.tourney : tourneyChan;
	
		try {
			const cTourney = await client.tournaments.finalize(tourney, { "include_participants": 1 });
			const tName = notPBCup ? cTourney.name : "A Pocketbot Cup";
	
			// Announce winners
			let winners = {};
			cTourney.participants
				.filter(p => !p.participant["has_irrelevant_seed"])
				.map( (obj) => {
					//console.log(obj.participant); // Need console.log for the raw object
					const player = obj.participant;
					// Earn WIP
					if (!process.env.LOCALTEST) {
						let wip = 5;
	
						if (player.final_rank === 1 ) { wip = 50; }
						else if (player.final_rank === 2) { wip = 30; }
						else if (player.final_rank === 3) { wip = 15; }
							
						// data.userdata.transferCurrency(null, player.misc, wip, true).then( (res) => {
						// 	console.log(`Giving ${player.misc} ${wip} WIP`);
						// 	if ( res.hasOwnProperty("err") ) logger.log(res.err, "Error");
						// });
					}
	
					let notTop3 = player.final_rank > 3 ? `-${player.seed}` : false;
					winners[`${player.final_rank}${(notTop3) ? notTop3 : ""}`] = player.misc 
						? player.misc 
						: player.name;
				});
	
			console.log(`Winners: ${winners["1"]}, ${winners["2"]}, ${winners["3"]}`);
	
			bot.createMessage(tChan, stripIndents`The tournament has come to a close! :tada: Our winners are:
	
				:first_place: <@${winners["1"]}> +50 ${x.emojis.wip}
				:second_place: <@${winners["2"]}> +30 ${x.emojis.wip}
				:third_place: <@${winners["3"]}> +15 ${x.emojis.wip}
	
				**All** other participants will receive 5 ${x.emojis.wip} as well. Thanks for playing, see you next time!`);
	
			bot.createMessage(x.memchan, stripIndents`${tName} has just finished, our winners are:
	
				:first_place: <@${winners["1"]}>
				:second_place: <@${winners["2"]}>
				:third_place: <@${winners["3"]}>
	
				${(notPBCup) ? "" : "If you wanna participate, keep an eye out for the signups every Monday at 2/6PM EST!"}`);
	
			console.log("Finished tournament.");
			resetTourneyVars();
		} catch (err) {
			console.error(err);
			bot.createMessage(tChan, `Couldn't end tournament: \`\`\`${err}\`\`\``);
		}
	}

	function resetTourneyVars() {
		// Remove ALL competitors
		Object.keys(tPlayers).forEach( (p, i) => {
			console.log(`Removing Competitor role from ${p}`);
			setTimeout(() => {
				const member = bot.guilds.get(x.chan).members.get(p);
				if (member) member.deleteRole(x.competitor);
			}, (i + 1) * 600);
		});
	
		// Now reset the vars
		tPlayers = {},
		tCount = 0,
		tRound = 1,
		currentTourney = null;
	}

	async function checkRound(msg) {
		// Check to see if previous round is over yet
		try {
			const t = await getTourneyData(),
				matches = t.matches.map( obj => obj.match ),
				roundList = Array.from( new Set( matches.map(m => m.round) ) ),
				notPBCup = (Object.keys(tPlayers).length > 0) ? false : true,
				tURL = (notPBCup) ? t.full_challonge_url : `http://pocketbotcup.challonge.com/pocketbotcup_${tNum}`,
				tChan = (notPBCup) ? x.tourney : tourneyChan;

			// Construct the roundMap
			let roundMap = [null];
			roundMap = roundMap.concat(roundList); //[null, 1, 2, ...]
			const bronze = (roundMap[roundMap.length - 1] === 0) ? roundMap.pop() : false; // If we have a round 0 (bronze) at the end, pop it out
			if (bronze === 0) roundMap.splice(roundMap.length - 1, 0, bronze); // and at it back as the 2nd to last round

			// Check how many open matches exist for the round
			const open = matches.filter( match => match.state === "open" && match.round == roundMap[tRound]);

			console.info(`Round ${roundMap[tRound]} - Open matches left: ${open.length} | ${roundMap}`);

			if (open.length === 0 && tRound < roundMap.length-1) {
				// Start next round
				tRound++;

				// Make arrays of players and matches
				let cPlayers = {},
					bronzeRound = (roundMap.includes(0)) ? roundMap.length-2 : null,
					finalRound = roundMap.length-1;

				// For each participant, create Challoge ID : Discord ID dictionary entry
				t.participants.forEach( (obj) => {
					cPlayers[obj.participant.id] = obj.participant.misc;
				});

				console.log(`Starting Round ${tRound} (${roundMap[tRound]} in roundMap)`);

				let cMatches = t.matches.map( obj => obj.match )
					.filter( match => match.round === roundMap[tRound]) // Get the ones for current round
					.map( match => {
						if (match.identifier !== "3P") { // For normal matches
							return `:regional_indicator_${match.identifier.toLowerCase()}: <@${cPlayers[match.player1_id]}> vs. <@${cPlayers[match.player2_id]}>`;
						} else { // For the bronze match
							return `:third_place: <@${cPlayers[match.player1_id]}> vs. <@${cPlayers[match.player2_id]}>`;
						}
					});

				if ((bronzeRound && tRound === roundMap.length-3) || (!bronzeRound && tRound === roundMap.length-2)) {
					bot.createMessage(tChan, stripIndents`**Semi-finals have begun! :mega:**

					Semi-final Matches :crossed_swords::
					${cMatches.join("\n")}

					${tURL}`);
				} else if (bronzeRound && tRound === bronzeRound) {
					// Finished Finals, time for bronze match
					bot.createMessage(tChan, stripIndents`**Our finalists are ready, but will now rest as we see who takes the bronze! :mega:**
					${cMatches.join("\n")}

					${tURL}`);
				} else if (tRound === finalRound) {
					// Finished Finals, time for bronze match
					bot.createMessage(tChan, stripIndents`**:trophy: :mega: And now for the grand finals! :mega: :trophy:**
					${cMatches.join("\n")}

					${(notPBCup) ?  "" : "Reminder: Finals are **best of 5**!"}`);
				} else {
					bot.createMessage(tChan, stripIndents`
					Round ${tRound} Matches :crossed_swords::
					${cMatches.join("\n")}

					${tURL}`);
				}
			} else if (tRound === roundMap.length-1) {
				// Finished
				finishTourney();
			} else {
				msg.channel.createMessage(`Currently playing Round ${roundMap[tRound]} - Open matches left: ${open.length}`);
			}
		} catch(e) {
			console.error(e);
		}
	}

	// ===================================
	// Tournament Commands
	// ===================================

	bot.registerCommand("makecup", (msg) => {
		msg.delete();
		makeTourney();
	}, {
		description: "Creates a new Pocketbot Cup",
		requirements: {
			roleIDs: [x.admin, x.adminbot, x.combot]
		}
	});

	bot.registerCommand("startcup", (msg, args) => {
		msg.delete();
		startTourney({ msg, args });
	}, {
		requirements: {
			description: "Starts a Pocketbot Cup",
			roleIDs: [x.admin, x.adminbot, x.combot]
		}
	});

	bot.registerCommand("endcup", (msg, args) => {
		msg.delete();
		const tid = args[1] || false;
		finishTourney(tid);
	}, {
		description: "Ends a running Pocketbot Cup",
		requirements: {
			roleIDs: [x.admin, x.adminbot, x.combot]
		}
	});

	bot.registerCommand("round", (msg) => {
		msg.delete();
		
		try {
			checkRound(msg);
		} catch(e) {
			console.error(e);
		}
	}, {
		description: "Ends a running Pocketbot Cup",
		requirements: {
			roleIDs: [x.admin, x.adminbot, x.combot]
		}
	});

	resumeTourney();
	return { 
		register() { console.info("Registered tournament commands."); }
	};
};