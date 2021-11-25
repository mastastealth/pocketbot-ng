const udata = require("../core/unitdata");
const u = udata.u;

module.exports = (bot) => {
  const { vars: x } = bot.PB;

  const allTraits = Object.keys(u.filters.traits).map((trait) => {
    return {
      name: u.filters.traits[trait].label,
      value: trait,
    };
  });

  bot.PB.slashCmds.push({
    info: {
      name: "info",
      description: "Shows you information on a given unit or trait.",
      options: [
        {
          name: "unit",
          description: "Select a creature or structure.",
          type: 3,
          choices: [
            {
              name: "Squirrel",
              value: "squirrel",
            },
            {
              name: "Lizard",
              value: "lizard",
            },
            {
              name: "Toad",
              value: "toad",
            },
            {
              name: "Mole",
              value: "mole",
            },
            {
              name: "Pigeon",
              value: "pigeon",
            },
            {
              name: "Ferret",
              value: "ferret",
            },
            {
              name: "Skunk",
              value: "skunk",
            },
            {
              name: "Falcon",
              value: "falcon",
            },
            {
              name: "Snake",
              value: "snake",
            },
            {
              name: "Chameleon",
              value: "chameleon",
            },
            {
              name: "Wolf",
              value: "wolf",
            },
            {
              name: "Owl",
              value: "owl",
            },
            {
              name: "Mouse",
              value: "mouse",
            },
            {
              name: "Fox",
              value: "fox",
            },
            {
              name: "Badger",
              value: "badger",
            },
            {
              name: "Boar",
              value: "boar",
            },
            {
              name: "Barbed Wire",
              value: "barbedwire",
            },
            {
              name: "Land Mine",
              value: "landmine",
            },
            {
              name: "Sniper Balloon",
              value: "balloon",
            },
            {
              name: "Machine Gun Turret",
              value: "machinegun",
            },
            {
              name: "Artillery",
              value: "artillery",
            },
            {
              name: "Farm Pig",
              value: "pig",
            },
            {
              name: "Gristmill",
              value: "gristmill",
            },
          ],
        },
        {
          name: "trait",
          description: "Select a trait (A - S)",
          type: 3,
          choices: allTraits.slice(0, 20),
        },
        {
          name: "moretraits",
          description: "Select a trait (S - Z)",
          type: 3,
          choices: allTraits.slice(21),
        },
      ],
    },
    cmd(action) {
      let item = action.data.options?.[0].value || "";

      // Check if unit exists
      if (u.units.hasOwnProperty(item)) {
        let label =
          u.units[item].label != undefined
            ? u.units[item].label
            : u.units[item].name;

        // If label still sucks
        if (label === undefined) label = "???";

        // Get some of the basic unit data
        let traits = u.units[item]?.traits || [];
        let cost = u.units[item].cost ?? "n/a";
        let range = "n/a";
        let tier = u.units[item].tier
          ? `[T${Math.ceil(u.units[item].tier)}] `
          : "n/a";

        // Traits Checker
        if (traits.length > 0) {
          for (let t in traits) {
            if (u.filters.traits[traits[t]].hasOwnProperty("wpn")) {
              // Is weapon, get range
              let w = u.filters.traits[traits[t]].wpn.replace("weapon_", "");
              range = u.weapons[w].AtkRange;
            }
          }

          if (traits.length === 1) {
            let w = u.filters.traits[traits[0]];
            traits = `\`\`\`${w.label} - ${w.desc} \`\`\``;
          } else {
            traits = `Traits: \`${traits.join("`, `")}\``;
          }
        }

        // More Info
        let warren = !u.units[item].struct
          ? x.emojis[`warrent${u.units[item].tier}`]
          : "";
        let ucost =
          !u.units[item].struct && u.units[item].tier
            ? `(${u.units[item].ucost}/unit)`
            : "";
        let url = "";
        let btime = u.units[item].time
          ? `:stopwatch: ${u.units[item].time}s`
          : "";

        // Wiki Link
        if (u.units[item].struct) {
          if (item != "pig" && item != "gristmill") {
            url = `\n\nv${u.version} | More info: <https://web.archive.org/web/20171223174349/toothandtailwiki.com/structures/${item}>`;
          } else {
            url = `\n\nv${u.version} | More info: <https://web.archive.org/web/20171223174349/toothandtailwiki.com/structures/gristmills-farms-pigs/>`;
          }
        } else if (!u.units[item].struct && tier != "n/a") {
          let t = u.units[item].tier;
          url =
            t && t != 3
              ? `\n\nv${u.version} | More info: <https://web.archive.org/web/20171223174349/toothandtailwiki.com/units/${item}s>`
              : `\n\nv${u.version} | More info: <https://https://web.archive.org/web/20171223174349/toothandtailwiki.com/units/${item}>`;
        } else {
          url = `\n\nv${u.version} | More info: <https://web.archive.org/web/20171223174349/toothandtailwiki.com/>`;
        }

        ucost = `${ucost}   `;

        if (u.units[item]?.traits.includes("summon")) {
          warren = "";
          ucost = "    ";
        }

        let atk = u.units[item].atk
          ? `:crossed_swords: **${u.units[item].atk}**    `
          : "";

        // Create embed
        let embed = {
          title: `${label}`,
          color: 0x33ff33,
          description: `aka ${u.units[item].name} | **${
            tier != "n/a" ? tier : ""
          }** ${warren != undefined ? warren : ""}

  ${atk}:shield: **${
            u.units[item].def
          }**    :pig2: **${cost}** ${ucost}:gun: **${range}**    ${btime}
  ${traits} ${url}`,
          thumbnail: {
            url: `https://gitlab.com/pocketrangers/pocketbot/raw/develop/assets/unit_${item}.png`,
            width: 48,
            height: 48,
          },
        };

        return action.createMessage({ embed });
      } else if (u.filters.traits[item]) {
        let t = u.filters.traits[item];
        let w = t.wpn ? ":gun:" : "";
        let wpn = t.wpn ? u.weapons[t.wpn.replace("weapon_", "")] : "";
        let extra =
          w != ""
            ? `\n\n \`Cooldown: ${wpn.cool} | Range: ${wpn.AtkRange} | Aggro: ${wpn.AggRange}\``
            : "";

        return action.createMessage(`${w} **${t.label}** - ${t.desc}${extra}`);
      } else {
        return action.createMessage(
          "I don't recognize that unit/trait. You must select an option from the lists provided by the subgroups."
        );
      }
    },
  });

  return {
    register() {
      console.info("Registered unit info commands.");
    },
  };
};
