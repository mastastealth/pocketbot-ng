const udata = require("../core/unitdata");

module.exports = (bot) => {
  const { vars: x } = bot.PB;

  bot.registerCommand("info", (msg, args) => {
    let item = args?.[0].toLowerCase() || "";
    let u = udata.u;

    // Aliases for unit names
    switch (item) {
    case "squirrels":
      item = "squirrel";
      break;
    case "lizards":
      item = "lizard";
      break;
    case "toads":
      item = "toad";
      break;
    case "moles":
      item = "mole";
      break;
    case "pigeons":
      item = "pigeon";
      break;
    case "ferrets":
      item = "ferret";
      break;
    case "skunks":
      item = "skunk";
      break;
    case "falcons":
      item = "falcon";
      break;
    case "snakes":
      item = "snake";
      break;
    case "wire":
    case "bw":
    case "barbed wire":
    case "barbwire":
      item = "barbedwire";
      break;
    case "mine":
    case "mines":
      item = "landmine";
      break;
    case "cham":
    case "chams":
    case "chameleons":
      item = "chameleon";
      break;
    case "sniper balloon":
    case "sniperballoon":
    case "sniper":
    case "baloon":
      item = "balloon";
      break;
    case "turret":
    case "turrets":
    case "nest":
    case "machine gun":
    case "mg":
    case "mgn":
      item = "machinegun";
      break;
    case "arty":
      item = "artillery";
      break;
    case "mice":
      item = "mouse";
      break;
    case "farm":
      item = "pig";
      break;
    case "windmill":
    case "mill":
      item = "gristmill";
      break;
    }

    // Check if unit exists
    if ( u.units.hasOwnProperty(item) ) {
      let label = (u.units[item].label != undefined) ? u.units[item].label : u.units[item].name;

      // If label still sucks
      if (label === undefined) label = "???";

      // Get some of the basic unit data
      let traits = u.units[item]?.traits || [];
      let cost = u.units[item].cost ?? "n/a";
      let range = "n/a";
      let tier = (u.units[item].tier) ? `[T${Math.ceil(u.units[item].tier)}] ` : "n/a";

      // Traits Checker
      if (traits.length > 0) {
        for (let t in traits) {
          if ( u.filters.traits[ traits[t] ].hasOwnProperty("wpn") ) {
            // Is weapon, get range
            let w = u.filters.traits[ traits[t] ].wpn.replace("weapon_","");
            range = u.weapons[w].AtkRange;
          }
        }

        if (traits.length === 1) {
          let w = u.filters.traits[ traits[0] ];
          traits = `\`\`\`${w.label} - ${w.desc} \`\`\``;
        } else {
          traits = `Traits: \`${traits.join("`, `")}\``;
        }
      }

      // More Info
      let warren = (!u.units[item].struct) ? x.emojis[`warrent${u.units[item].tier}`] : "";
      let ucost = (!u.units[item].struct && u.units[item].tier) ? `(${u.units[item].ucost}/unit)` : "";
      let url = "";
      let btime = (u.units[item].time) ? `:stopwatch: ${u.units[item].time}s`: "";

      // Wiki Link
      if (u.units[item].struct) {
        if (item != "pig" && item != "gristmill") {
          url = `\n\nv${u.version} | More info: <https://web.archive.org/web/20171223174349/toothandtailwiki.com/structures/${item}>`;
        } else {
          url = `\n\nv${u.version} | More info: <https://web.archive.org/web/20171223174349/toothandtailwiki.com/structures/gristmills-farms-pigs/>`;
        }
      } else if (!u.units[item].struct && tier != "n/a") {
        let t = u.units[item].tier;
        url = (t && t != 3) ? `\n\nv${u.version} | More info: <https://web.archive.org/web/20171223174349/toothandtailwiki.com/units/${item}s>` : `\n\nv${u.version} | More info: <https://https://web.archive.org/web/20171223174349/toothandtailwiki.com/units/${item}>`;
      } else {
        url = `\n\nv${u.version} | More info: <https://web.archive.org/web/20171223174349/toothandtailwiki.com/>`;
      }
    
      ucost = `${ucost}   `;
  
      if (u.units[item]?.traits.includes("summon")) {
        warren = "";
        ucost = "    ";
      }

      let atk = u.units[item].atk ? `:crossed_swords: **${u.units[item].atk}**    `: "";

      // Create embed
      let embed = {
        title: `${label}`,
        color: 0x33ff33,
        description: `aka ${u.units[item].name} | **${(tier != "n/a") ? tier : ""}** ${(warren != undefined) ? warren: ""}

  ${atk}:shield: **${u.units[item].def}**    :pig2: **${cost}** ${ucost}:gun: **${range}**    ${btime}
  ${traits} ${url}`,
        thumbnail: {
          url: `https://gitlab.com/pocketrangers/pocketbot/raw/develop/assets/unit_${item}.png`,
          width: 48,
          height: 48
        }
      };

      msg.channel.createMessage({ embed });
    } else if (u.filters.traits[item]) {
      let t = u.filters.traits[item]
      let w = (t.wpn) ? ":gun:" : "";
      let wpn = (t.wpn) ? u.weapons[ t.wpn.replace("weapon_","") ] : "";
      let extra = (w != "") ? `\n\n \`Cooldown: ${wpn.cool} | Range: ${wpn.AtkRange} | Aggro: ${wpn.AggRange}\`` : "";

      msg.channel.createMessage(`${w} **${t.label}** - ${t.desc}${extra}`);
    } else {
      msg.channel.createMessage("I don't recognize that unit/trait. Try `!units` or `!traits` to get a list.");
    }
  }, {
    description: "Shows you information on a given unit"
  });

  return { 
    register() { console.info("Registered unit info commands."); }
  };
};
