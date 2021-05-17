module.exports = (bot) => {
	const x = bot.PB.vars;
	const main = bot.PB.main;
	// const STRIKE_COUNT = 3;

	bot.registerCommand("say", (msg) => {
		bot.createMessage(x.chan, msg.content.replace("!say ", ""));
	}, {
		description: "Allows admin to speak as PB",
		requirements: {
			roleIDs: [x.admin]
		}
	});

	// Mod/Admin can rename a user
	bot.registerCommand("rename", async (msg, args) => {
		if (!msg.mentions.length && args.length !== 2) {
			msg.channel.createMessage("No user detected. Enter the user via an @ mention or by ID.");
			return false;
		}

		const target = msg.mentions.length 
			? await bot.guilds.get(x.chan).members.get(msg.mentions[0].id) 
			: await bot.guilds.get(x.chan).members.get(args[0]);
		const prevName = target && target.nick ? target.nick : "N/A"; // Return current nickname of member

		if (target) {
			target.edit({
				nick: args.slice(1).join(" ")
			}, "Renamed user because his name probably sucked.");
	
			msg.delete();
			main.modEmbed({
				admin: msg.author,
				action: "rename",
				icon: ":crayon:",
				user: target.id,
				prevName,
				bot
			});
		}
	}, {
		requirements: {
			description: "Allows mod/admin to rename a user",
			roleIDs: [x.admin, x.mod]
		}
	});

	return { 
		register() { console.info("Registered admin commands."); }
	};
};