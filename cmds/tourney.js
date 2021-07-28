const challonge = require("challonge-node-ng");
const stripIndents = require("common-tags").stripIndents;

module.exports = (bot) => {
  const { vars: x, fb, helpers } = bot.PB;
  const client = challonge.withAPIKey(process.env.CHALLONGE);

  let currentTourney = null;
  let tNum = null;
  let tPlayers = {};
  let tRound = null;
  let tCount = 0;
  let tType = "Pocketbot";
  let tourneyChan = (process.env.LOCALTEST) ? x.testing : x.pbcup;

  // In case of reset/crash mid tourney, look for any open PB tournaments and set all the data from there
  async function resumeTourney() {
    try {
      const tournies = await client.tournaments.index({ "subdomain": "pocketbotcup" });
      const openT = tournies.filter(t => t.state !== "complete");

      if (openT[0]) {
        // Set ID and count
        currentTourney = openT[0].id;
        tNum = tournies.length;

        // Let's get back the participant/round data
        let tData = await getTourneyData();

        tData.participants.forEach(obj => tPlayers[obj.participant.misc] = obj.participant.id);
        tCount = Object.keys(tPlayers).length;

        let earlyMatch = tData.matches.map(obj => obj.match)
          .filter(match => match.state === "open"),
          completeMatches = tData.matches.map(obj => obj.match)
            .filter(match => match.state === "complete");

        tRound = (earlyMatch[0]) ? earlyMatch[0].round : 1; // If we got back an open match, first should contain earliest round

        if (tRound === 3) {
          tRound = (earlyMatch[earlyMatch.length - 1].round === 0) ? tRound : 4; // Unless of course Round 0 (which is the bronze match), is hiding at the end
        }

        if (tData.matches.length === completeMatches.length) tRound = 4; // If ALL matches are done, set to final round

        console.log(`Found existing tournament: ${currentTourney} | Now resuming from Round ${tRound} with ${tCount} players.`, "OK");
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Retrieves tourney data with participants and matches as well
  function getTourneyData(id = currentTourney) {
    return client.tournaments.show(id, { "include_participants": 1, "include_matches": 1 });
  }

  // This will create the tournament in Challonge
  async function makeTourney(msg) {
    bot.createMessage(tourneyChan, `🕑 Creating a new tournament...`);
  
    let description = "Welcome to the new and fully automated <strong>Pocketbot Cup</strong>! This is a weekly cup run by Pocketbot every Monday to let players enjoy a small dose of competition, while helping analyze replay data with the latest patch. If you have any questions or suggestions, talk to Mastastealth on the <a href='http://discord.gg/pockwatch'>PWG Discord</a>.";

    if (msg && !helpers.hasModPerms(msg.member.roles)) {
      description = `This is a custom cup made by the community. This one was started by ${msg.author.username}.`;
      tType = "Community";

      setTimeout(() => {
        const cmd = Object.values(bot.commands).filter(cmd => cmd.label.includes("startcup"))[0];
			  cmd.execute(null, null, { client: bot });
      }, 1000 * 60 * 60);
    }

    try {
      const cups = await client.tournaments.index({ "subdomain": `pocketbotcup` });
      tNum = cups.filter(cup => cup.url.includes(`${tType.toLowerCase()}cup`)).length + 1;

      const tournament = await client.tournaments.create({
        "tournament": {
          "name": `${tType} Cup #${tNum}`,
          "url": `${tType.toLowerCase()}cup_${tNum}`,
          description,
          "subdomain": "pocketbotcup",
          "hold_third_place_match": true,
          "accept_attachments": true,
          "signup_cap": 16,
          "start_at": new Date(Date.now() + (60 * 60 * 1000)), // Start in 1h
          "show_rounds": true,
          "game_id": 54849,
          "game_name": "Tooth and Tail"
        }
      });

      console.log(`Created tournament: ${tournament.id}`);
      currentTourney = tournament.id;

      // PB announces it
      bot.createMessage(tourneyChan, `:trophy: A new ${tType} Cup has begun! Follow it on Challonge here: http://pocketbotcup.challonge.com/${tType.toLowerCase()}cup_${tNum} \n\n There are 16 slots available. Tournament starts in 1 hour, check-ins open 15 minutes prior to start.`);
    } catch (e) {
      console.error(e);
    }
  }

  // Process check-ins and commence tournament
  async function startTourney({ msg, args }, tid = null) {
    // If we got a manual ID, use that, otherwise default
    const tChan = (tid) ? x.tourney : tourneyChan;
    const cTourneyScoped = (tid) ? tid : currentTourney;

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
        cTourney.participants.forEach((obj) => {
          cPlayers[obj.participant.id] = (obj.participant.misc) ? obj.participant.misc : 0;
        });

        // Find all round 1 matches and return vs. strings with <@user> pings
        const cMatches = cTourney.matches
          .map(obj => obj.match)
          .filter(match => match.state === "open" && match.round === 1)
          .map(match => {
            return `:regional_indicator_${match.identifier.toLowerCase()}: <@${cPlayers[match.player1_id]}> vs. <@${cPlayers[match.player2_id]}>`;
          });

        bot.createMessage(tChan, stripIndents`${(!tid) ? "Processed all players who checked in. " : ""}**Let the games begin! :mega:**

        Round 1 Matches :crossed_swords::
        ${cMatches.join("\n")}

        **Reminder**: Submit your scores in this channel with the format \`!score x-y\`, no more replays necessary! ${(!tid) ? "Matches are **best of 3**." : ""}`);

        tRound = 1; // Start round 1

        if (tid) {
          currentTourney = tid;
          return false; // No role cleanup on custom tournies
        }

        // Remove all the people with Competitor who AREN'T playing
        // TODO - Don't need this anymore?
        const cPlaying = cTourney.participants
          .map(obj => obj.match)
          .filter(player => player && player.seed > 8);

        Object.values(cPlaying).forEach((p, i) => {
          setTimeout(async () => {
            const member = await bot.guilds.get(x.chan).members.get(p.misc);
            member?.removeRole(x.competitor, "Removing idle players from PBC");
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

    const tName = notPBCup ? cTourney.name : `A ${tType} Cup`;
    let prize = tType === "Pocketbot" ? [50, 30, 15] : [25, 15, 10];

    try {
      const cTourney = await client.tournaments.finalize(tourney, { "include_participants": 1 });

      // Announce winners
      let winners = {};

      cTourney.participants
        .filter(p => !p.participant["has_irrelevant_seed"])
        .map((obj) => {
          //console.log(obj.participant); // Need console.log for the raw object
          const player = obj.participant;

          // Earn WIP
          if (!process.env.LOCALTEST) {
            let wip = 5;

            if (player.final_rank === 1) { wip = prize[0]; }
            else if (player.final_rank === 2) { wip = prize[1]; }
            else if (player.final_rank === 3) { wip = prize[2]; }

            fb.setProp(player.misc, "currency", wip);
            console.log(`Giving ${player.misc} ${wip} WIP`);
          }

          let notTop3 = player.final_rank > 3 ? `-${player.seed}` : false;

          winners[`${player.final_rank}${(notTop3) ? notTop3 : ""}`] = player.misc
            ? player.misc
            : player.name;
        });

      console.log(`Winners: ${winners["1"]}, ${winners["2"]}, ${winners["3"]}`);

      bot.createMessage(tChan, stripIndents`The tournament has come to a close! :tada: Our winners are:
  
        :first_place: <@${winners["1"]}> +${prize[0]} ${x.emojis.wip}
        :second_place: <@${winners["2"]}> +${prize[1]} ${x.emojis.wip}
        :third_place: <@${winners["3"]}> +${prize[2]} ${x.emojis.wip}
  
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

  // Reset tourney data
  async function resetTourneyVars() {
    tCount = 0;
    tRound = 1;
    tType = "Pocketbot";
    currentTourney = null;

    // Remove ALL competitors
    if (Object.keys(tPlayers).length) {
      try {
        await Promise.all(
          Object.keys(tPlayers).map(p => {
            const member = bot.guilds.get(x.chan).members.get(p);
            return member?.removeRole(x.competitor, "PBC Completed");
          })
        );

        console.log('Cleared all competitors.');
        tPlayers = {};
      } catch (e) { console.error(e); }
    }
  }

  // Checks whether a round has completed or not
  async function checkRound(msg) {
    // Check to see if previous round is over yet
    try {
      const t = await getTourneyData();
      const matches = t.matches.map(obj => obj.match);
      const roundList = Array.from(new Set(matches.map(m => m.round)));
      const notPBCup = (Object.keys(tPlayers).length > 0) ? false : true;
      const tURL = (notPBCup) ? t.full_challonge_url : `http://pocketbotcup.challonge.com/${tType.toLowerCase()}cup_${tNum}`;
      const tChan = (notPBCup) ? x.tourney : tourneyChan;

      // Construct the roundMap
      let roundMap = [null];
      roundMap = roundMap.concat(roundList); //[null, 1, 2, ...]
      const bronze = (roundMap[roundMap.length - 1] === 0) ? roundMap.pop() : false; // If we have a round 0 (bronze) at the end, pop it out
      if (bronze === 0) roundMap.splice(roundMap.length - 1, 0, bronze); // and at it back as the 2nd to last round

      // Check how many open matches exist for the round
      const open = matches.filter(match => match.state === "open" && match.round == roundMap[tRound]);

      console.info(`Round ${roundMap[tRound]} - Open matches left: ${open.length} | ${roundMap}`);

      if (open.length === 0 && tRound < roundMap.length - 1) {
        // Start next round
        tRound++;

        // Make arrays of players and matches
        let cPlayers = {};
        let bronzeRound = (roundMap.includes(0)) ? roundMap.length - 2 : null;
        let finalRound = roundMap.length - 1;

        // For each participant, create Challoge ID : Discord ID dictionary entry
        t.participants.forEach((obj) => {
          cPlayers[obj.participant.id] = obj.participant.misc;
        });

        console.log(`Starting Round ${tRound} (${roundMap[tRound]} in roundMap)`);

        let cMatches = t.matches.map(obj => obj.match)
          .filter(match => match.round === roundMap[tRound]) // Get the ones for current round
          .map(match => {
            if (match.identifier !== "3P") { // For normal matches
              return `:regional_indicator_${match.identifier.toLowerCase()}: <@${cPlayers[match.player1_id]}> vs. <@${cPlayers[match.player2_id]}>`;
            } else { // For the bronze match
              return `:third_place: <@${cPlayers[match.player1_id]}> vs. <@${cPlayers[match.player2_id]}>`;
            }
          });

        if ((bronzeRound && tRound === roundMap.length - 3) || (!bronzeRound && tRound === roundMap.length - 2)) {
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

          ${(notPBCup) ? "" : "Reminder: Finals are **best of 5**!"}`);
        } else {
          bot.createMessage(tChan, stripIndents`
          Round ${tRound} Matches :crossed_swords::
          ${cMatches.join("\n")}

          ${tURL}`);
        }
      } else if (tRound === roundMap.length - 1) {
        // Finished
        finishTourney();
      } else {
        msg.channel.createMessage(`Currently playing Round ${roundMap[tRound]} - Open matches left: ${open.length}`);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function addPlayer(msg, cid, tid = null, tRole = null) {
    const stamp = process.env.LOCALTEST ? `__${Date.now()}` : false,
      u = {
        "name": `${msg.author.username}${(stamp) ? stamp : ""}`,
        "misc": `${msg.author.id}`
      };

    // Set the challonge ID if they pass in an account
    if (cid) {
      u["challonge_username"] = cid;
      delete u.name;
    }

    // If this is a custom tournament, require a Challonge account
    if (tid && !cid) {
      msg.channel.createMessage(`<@${msg.author.id}>, you're going to need a Challonge account registered to join a custom tournament! Please use \`!challonge username\` to register your account, then you can remove/readd your :thumbsup: to try again.`);
      return false;
    }

    const cTourneyLocal = (tid) ? tid : currentTourney;

    try {
      let player = await client.participants.create(cTourneyLocal, { participant: u });

      // Ignore the rest if custom tournament 
      if (tid) {
        // Add custom role
        if (tRole) msg.member.addRole(tRole);

        msg.channel.createMessage(`<@${msg.author.id}> has entered the tournament! ${(cid) ? ":comet:" : ""}`);
        return false;
      }

      tCount++;
      tPlayers[msg.author.id] = player.id; // Store a local list of players 

      msg.member.addRole(x.competitor).catch((e) => {
        console.error(e);
      });

      if (tCount >= 17) {
        msg.channel.createMessage(`<@${msg.author.id}> is on standby! ${(cid) ? ":comet:" : ""}`);
      } else {
        msg.channel.createMessage(`<@${msg.author.id}> has entered the Cup! ${(cid) ? ":comet:" : ""}`);
      }

      // Check if we've hit our player limit 
      if (tCount === 16) {
        setTimeout(() => {
          msg.channel.createMessage(":trophy: We have now reached the maximum amount of participants! I will announce check-ins later on.");
        }, 1000);
      }
    } catch (e) {
      console.error(e);
      msg.channel.createMessage(`🕑 An error occurred adding participant to tournament ${cTourneyLocal}. :frowning: \`\`\`${e}\`\`\``);
    }
  }

  async function deletePlayer(msg, cid, did, tid = null,) {
    const cTourney = tid || currentTourney;

    try {
      await client.participants.delete(cTourney, cid);
      msg.channel.createMessage(`🕑 <@${did}> has been removed from the tournament. Hope you can play next time!`);
      if (tPlayers[cid]) delete tPlayers[cid];
    } catch (e) {
      msg.channel.createMessage("🕑 Removal unsuccessful, guess you're stuck playing. Forever.");
      console.error(`Failed for user: ${cid}`, e);
    }
  }

  async function updateScore(msg, args) {
    // TODO - Ripped out all the file based junk for now
    const score = (args[0]?.length === 3) ? args[0].split("-") : false;
    const PBCup = (Object.values(tPlayers).length > 0) ? true : false;

    if (!score) {
      msg.channel.createMessage("What was the score? Use the syntax `!score x-y`, no spaces between the number and dash.");
      return false;
    }

    // Check scores to be realistic
    if (PBCup) {
      if (parseInt(score[0]) > 3 || parseInt(score[1]) > 3) {
        msg.channel.createMessage("Those are some fishy scores. Double check they are correct!");
        return false;
      }
    }

    // Ok, we do have a winner, commence score upload stuff!
    let winnerID,
      winnerCID,
      cTourney = await getTourneyData(),
      matches = cTourney.matches.map(obj => obj.match),
      roundList = Array.from(new Set(matches.map(m => m.round)));

    let roundMap = [null];
    roundMap = roundMap.concat(roundList); //[null, 1, 2, ...];

    const bronze = (roundMap[roundMap.length - 1] === 0) ? roundMap.pop() : false; // If we have a round 0 (bronze) at the end, pop it out
    if (bronze === 0) roundMap.splice(roundMap.length - 1, 0, bronze); // and add it back as the 2nd to last round;

    // Set the winner
    if (score[0] > score[1]) {
      winnerID = msg.author.id;

      // Get the winner's challonge ID
      if (PBCup) { // If PB Cup
        for (let p in tPlayers) {
          if (p === winnerID) winnerCID = tPlayers[p];
        }
      } else {
        // If it's a custom cup, we'll need to do a little more work
        const players = cTourney.participants.map(p => p.participant);
        players.forEach(p => {
          if (p.misc == winnerID) winnerCID = p.id;
        });
      }

    } else {
      // Welp, now I gotta find the opponent automatically.
      cTourney.matches.forEach(obj => {
        // Only check open matches
        if (obj.match.state === "open") {
          // See if person uploading is player1 or 2 of the match
          let players = [obj.match.player1_id, obj.match.player2_id];

          // For PB Cups, use tPlayer data
          if (PBCup) {
            if (tPlayers[msg.author.id] == players[0]) { // Uploader is player 1, so winner is player2
              for (let w in tPlayers) { if (tPlayers[w] === players[1]) winnerID = tPlayers[w]; }
              winnerCID = players[1];
            } else if (tPlayers[msg.author.id] == players[1]) { // Uploader is player 2, winner is player 1
              for (let w in tPlayers) { if (tPlayers[w] === players[0]) winnerID = tPlayers[w]; }
              winnerCID = players[0];
            }
          } else { // Otherwise, do more hunting
            let myCID;

            // First get my challonge ID
            const allPlayers = cTourney.participants.map(p => p.participant);
            allPlayers.forEach(p => { if (p.misc == msg.author.id) myCID = p.id; });

            // Now see if winner is player 1 or 2
            winnerCID = (myCID == players[0]) ? players[1] : players[0];
          }
        }
      });
    }

    if (winnerCID === null || winnerCID === undefined) {
      msg.channel.createMessage("Hmm, I couldn't find a proper Challonge ID to match your Discord ID. That's not good...");
      return false;
    }

    // Now let's look at the correct match and update it accordingly
    let match;

    matches.forEach(obj => {
      console.log(`Analysing ${obj.id} | ${obj.round} for Round ${tRound}`, "Info");

      if (obj.state === "open" && obj.round == roundMap[tRound]) {
        console.log(`Looking for ${winnerCID}...`);
        if (obj.player1_id == winnerCID || obj.player2_id == winnerCID) match = obj;
      }
    });

    // Attach link to match
    try {
      console.log(match.id);
      // console.log("Attaching match replays...");

      // await client.matches.add_attach(currentTourney, match.id, { match_attachment: { url: file.url, description: file.filename } });

      // Format things correctly and update score
      console.log("Formatting score for update");
      if (score[0] > score[1] && match.player1_id == winnerCID) {
        await client.matches.update(currentTourney, match.id, { "match": { "scores_csv": `${score[0]}-${score[1]}`, "winner_id": winnerCID } });
      } else if (score[1] > score[0] && match.player1_id == winnerCID) {
        await client.matches.update(currentTourney, match.id, { "match": { "scores_csv": `${score[1]}-${score[0]}`, "winner_id": winnerCID } });
      } else if (score[0] > score[1] && match.player2_id == winnerCID) {
        await client.matches.update(currentTourney, match.id, { "match": { "scores_csv": `${score[1]}-${score[0]}`, "winner_id": winnerCID } });
      } else if (score[1] > score[0] && match.player2_id == winnerCID) {
        await client.matches.update(currentTourney, match.id, { "match": { "scores_csv": `${score[0]}-${score[1]}`, "winner_id": winnerCID } });
      }

      msg.channel.createMessage("Score updated. :tada: Please wait for round to finish before reporting your next match.");
      msg.channel.createMessage(`<@${msg.author.id}> has updated their score. :tada:`); // TODO - Replace with an embed replay summary?

      checkRound(msg);
    } catch (err) {
      console.error(err);
      msg.channel.createMessage(`Dang it, something went wrong with the score submission. Try again? If you think you did everything correctly, talk to <@${x.stealth}>! :scream: \n \`\`\`Error: ${err}\`\`\``);
    }
  }

  // ===================================
  // Tournament Commands
  // ===================================

  bot.registerCommand("makecup", (msg) => {
    console.log('Attempting to make cup...');
    msg?.delete();

    if (currentTourney) {
      return msg.channel.createMessage("Cup currently in progress, try again later.");
    }

    makeTourney(msg);
  }, {
    description: "Creates a new Pocketbot or Community Cup",
    cooldown: 1000 * 60 * 60,
    cooldownMessage: "One cup at a time bro, give me a break.",
    cooldownReturns: 2
  });

  bot.registerCommand("startcup", (msg, args) => {
    msg?.delete();
    startTourney({ msg, args });
  }, {
    description: "Starts a Pocketbot Cup",
    requirements: {
      custom(msg) {
        return helpers.hasModPerms(msg.member.roles);
      }
    }
  });

  bot.registerCommand("endcup", (msg, args) => {
    msg?.delete();
    const tid = args[1] || false;
    finishTourney(tid);
  }, {
    description: "Ends a running Pocketbot Cup",
    requirements: {
      custom(msg) {
        return helpers.hasModPerms(msg.member.roles);
      }
    }
  });

  bot.registerCommand("round", (msg) => {
    msg?.delete();

    try {
      checkRound(msg);
    } catch (e) {
      console.error(e);
    }
  }, {
    description: "Attempt to wrap up the round in a Pocketbot Cup",
    requirements: {
      custom(msg) {
        return helpers.hasModPerms(msg.member.roles);
      }
    }
  });

  bot.registerCommand("signoutremind", (msg) => {
    msg?.delete();
    bot.createMessage(tourneyChan, `<@&${x.competitor}>s if you cannot play in the tournament starting soon, go ahead and \`!signout\`. Otherwise, good luck!`);
  }, {
    description: "Reminds PBC Competitors that tournament will start soon.",
    requirements: {
      custom(msg) {
        return helpers.hasModPerms(msg.member.roles);
      }
    }
  });

  bot.registerCommand("signup", async (msg, args) => {
    msg.delete();

    const cid = await fb.getProp(msg.author.id, "challonge"); // Challonge username (optional for PB Cup)
    const tid = args[0] || null;

    // Check for an actual tournament
    if (!currentTourney && !tid) {
      return msg.channel.createMessage("🕑 There are no Pocketbot Cups currently running. :thinking: Try again some other time!");
    }

    // Check if you already signed up
    if (tPlayers[msg.author.id] && !tid) {
      return msg.channel.createMessage("🕑 You've already signed up. :tada:");
    }

    // Otherwise, if we're under 16 participants, add to tournament
    if ((tCount < 16 && !tid) || tid) {
      const tRole = null; // TODO - Check for custom tRoles
      addPlayer(msg, cid, tid, tRole);
    } else {
      msg.channel.createMessage("🕑 The tournament has reached the maximum number of entries. Hope to see you next week!");
    }
  }, {
    description: "Adds player to tournament",
    aliases: ["signin", "singup"],
    cooldown: 5000
  });

  bot.registerCommand("signout", async (msg) => {
    msg.delete();

    // Get the player's ID
    const pid = msg.author.id;

    // Check for tourney
    if (!currentTourney) {
      return msg.channel.createMessage("🕑 There are no Pocketbot Cups currently running.");
    }

    if (!tPlayers[msg.author.id]) {
      return msg.channel.createMessage("🕑 You haven't even signed up, liar.");
    }

    try {
      deletePlayer(msg, tPlayers[pid], pid);
    } catch(e) {
      console.error(e);
      msg.channel.createMessage("🕑 There was an error signing out.");
    };
  }, {
    description: "Signs out of currently running Pocketbot Cup"
  });

  bot.registerCommand("score", (msg, args) => {
    if (!currentTourney) {
      msg.channel.createMessage("🕑 There are no Pocketbot Cups currently running. :thinking: Try again some other time!");
      return false;
    }

    // Check if we're looking for a score from this person anyway
    if (process.env.LOCALTEST && !tPlayers.hasOwnProperty(msg.author.id)) {
      if (Object.values(tPlayers).length > 0) {
        msg.channel.createMessage("🕑 Uhm...you don't seem to be in the tournament, so I'm going to go ahead and ignore you. :sweat_smile:");
        return false;
      }
    }

    updateScore(msg, args);

    // TODO - Restore the rest when we have file uploading again
  }, {
    description: "Submits a score for a currently running Pocketbot Cup"
  });

  bot.registerCommand("dq", async (msg, args) => {
    msg.delete();

    let player = helpers.getUser(args[0]);

    // Check for an actual tournament
    if (!currentTourney) {
      return msg.channel.createMessage("🕑 There are no Pocketbot Cups currently running. :thinking:");
    }

    // Check if you already signed up
    if (!tPlayers.hasOwnProperty(player)) {
      return msg.channel.createMessage("🕑 This user isn't even part of the tournament.");
    }

    await deletePlayer(msg, tPlayers[player], player);
    checkRound(msg);
  }, {
    description: "Removes a user from a currently running Pocketbot Cup",
    requirements: {
      custom(msg) {
        return helpers.hasModPerms(msg.member.roles);
      }
    }
  });

  // TODO - bot.registerCommand("tourney", (msg)=> {});
  // TODO - bot.registerCommand("starttourney", (msg)=> {});
  // TODO - bot.registerCommand("endtourney", (msg)=> {});

  bot.registerCommand("challonge", (msg) => {
    // const cid = args[0];
    msg.delete();

    let cidFB;
    // TODO
    // let cidFB = await data.userdata.setProp({
    // 	user: msg.author.id,
    // 	prop: {
    // 		name: "challonge",
    // 		data: cid
    // 	}
    // });

    if (cidFB) {
      // TODO - Make PM
      // msg.channel.createMessage(`All right, you have registered \`${cid}\` as your Challonge username. **Make sure this link points to your profile**: <http://challonge.com/users/${cid}> , otherwise you won't be able to properly sign up for tournaments!`);
    } else {
      msg.channel.createMessage("🕑 Huh. Something went wrong here. Talk to Mastastealth about it.");
    }
  });

  bot.registerCommand("bracket", async (msg) => {
    msg.delete();

    let t = await getTourneyData();
    let tURL = t.full_challonge_url;

    msg.channel.createMessage(`:trophy: The current tournament bracket can be found at: ${tURL}`);
  });

  // ====================================
  // Do I need these commands anymore?
  // ====================================
  // bot.registerCommand("lsreplays", (msg)=> {}); - Maybe
  // bot.registerCommand("settr", (msg)=> {});
  // bot.registerCommand("lscup", (msg)=> {});
  // bot.registerCommand("addmatch", (msg)=> {});
  // bot.registerCommand("randomize", (msg)=> {});
  // bot.registerCommand("lstournies", (msg)=> {});
  // bot.registerCommand("settid", (msg)=> {});

  resumeTourney();

  return {
    register() { console.info("Registered tournament commands."); }
  };
};
