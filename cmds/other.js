module.exports = (bot) => {
	const  { vars: x } = bot.PB;

	bot.registerCommand("8ball", (msg) => {
    let x = Math.floor(Math.random() * (20)-1),
		answer = [
			"It is certain", "It is decidedly so", "Without a doubt", "Yes, definitely",
			"As I see it, yes", "Most likely", "Outlook good", "Yes",
			"Signs point to yes", "Reply hazy try again", "Ask again later", "Better not tell you now",
			"Cannot predict now", "Concentrate and ask again", "Don't count on it", "My reply is no",
			"My sources say no", "Outlook not so good", "Very doubtful"
		];

	  msg.channel.createMessage(`:8ball: says _"${answer[x]}"_`,);
	}, {
		description: "Seek the wisdom of PB"
	});

	return { 
		register() { console.info("Registered other commands."); }
	};
};