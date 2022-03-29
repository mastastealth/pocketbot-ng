const fs = require("fs");
const path = require("path");

const emotes = function () {
  const _emotes = [];
  const _gifemotes = [];

  fs.readdir(path.join(__dirname, "..", "emoji"), (err, files) => {
    if (err) return console.error(err);

    for (let i = 0; i < files.length; i++) {
      if (path.parse(files[i]).ext === ".gif") {
        _gifemotes.push(path.parse(files[i]).name);
      } else {
        _emotes.push(path.parse(files[i]).name);
      }
    }
  });

  return {
    emotes: _emotes,
    gifs: _gifemotes,
  };
};

module.exports = (CONSTS) => {
  return {
    chan: "99240110486192128", // PWG Server/Main Channel ID
    components: {
      TestBtn: {
        type: 2,
        custom_id: "pb-test-btn",
        label: "TEST ME",
        style: CONSTS.ButtonStyles.PRIMARY,
      },
      SignupBtn: {
        type: 2,
        custom_id: "pbc-signup-v2",
        label: "Sign Up for PBC",
        style: CONSTS.ButtonStyles.PRIMARY,
        emoji: {
          id: null,
          name: "✅",
        },
      },
      ModActionSelect: {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: "mod_action_pls",
            options: [
              {
                label: "Language Warning",
                value: "vulgar",
                description: "For when they're being vulgar",
                emoji: {
                  name: "🙈",
                  id: null,
                },
              },
              {
                label: "Attitude Warning",
                value: "pill",
                description: "For when they need a chill pill",
                emoji: {
                  name: "💊",
                  id: null,
                },
              },
              {
                label: "Spam Warning",
                value: "spam",
                description: "For when they need to talk less",
                emoji: {
                  name: "🤐",
                  id: null,
                },
              },
              {
                label: "Dismiss",
                value: "dismiss",
                description: "Do nothing at all",
                emoji: {
                  name: "😴",
                  id: null,
                },
              },
            ],
            placeholder: "Choose an action to take!",
            min_values: 1,
            max_values: 1,
          },
        ],
      },
    },
    firebasecfg: {
      apiKey: process.env.FBKEY2,
      authDomain: "pocketbot-40684.firebaseapp.com",
      databaseURL: "https://pocketbot-40684.firebaseio.com",
      storageBucket: "pocketbot-40684.appspot.com",
      messagingSenderId: "969731605928",
    },

    // Users -----------------------
    stealth: "98419293514919936",
    schatz: "99245922310959104",
    nguyen: "99233194800328704",
    adam: "115912365966360576",
    nooneImportant: "145425008590716929",
    mbot: "377274977944338433",

    // Roles -----------------------
    noob: "195983997413752832", // Recruit
    member: "99502270579740672", // Veteran
    ptg: "238808560106995712", // Playing the game
    lfg: "892587568514871349", // Looking for game
    mod: "99565011696910336",
    admin: "103552189221326848", //Developer
    competitor: "294543037411885058",
    combot: "232847471963930624", // Community bot
    adminbot: "189150655212945409",
    pwfaction: "444663748112678922",
    muted: "268150552699863042",
    win: "303514597028003840",
    mac: "177972198055608320",
    nix: "210436394219208704",
    na: "387734041572671488",
    eu: "387734208698777600",
    au: "387734490036043776",
    streamfan: "957012663139967028",
    monacofan: "958192040074674246",

    // Channels --------------------
    memchan: "245596925531783168", // #toothandtail
    rules: "435940618544480266",
    tourney: "199648848337960961",
    pbcup: "410202459039072276",
    history: "196362695367196672",
    playground: "172429393501749248",
    modbiz: "180446374704316417",
    modchan: "344957359694807042",
    techtalk: "200666247694778378",
    trouble: "134810918113509376",
    testing: "246281054598594560",
    pworld: "444662873491505182",
    house: "952985568915116102",

    // Emotes and junk
    emotes: emotes().emotes,
    gifemotes: emotes().gifs,
    gifaliases: {
      patch17: "schatzmeteor",
    },
    aliases: {
      yourmother: "yomama",
    },

    //Custom emojis
    emojis: {
      //Devs
      schatz: "<:schatz:230393920842891264>",
      masta: "<:masta:230396612797661185>",
      adam: "<:adam:230394845108240384>",
      joe: "<:joe:916483093412597770>",

      //Bots
      ryionbot: "<:ryionbot:247030935021682688>",
      bookbot: "<:bookbot:247030934287810563>",
      mastabot: "<:mastabot:247030934933733376>",
      lucille: "<:lucille:247030934929539073>",

      // Units
      warrent1: "<:warrent1:253571862926196736>",
      warrent2: "<:warrent2:253571862733258754>",
      warrent3: "<:warrent3:253571863026991124>",
      squirrel: "<:tntsquirrel:253727216251174915>",
      toad: "<:tnttoad:253732160706445313>",
      lizard: "<:tntlizard:253727216456695808>",
      mole: "<:tntmole:253728669808197643>",
      pigeon: "<:tntpigeon:253732160878411776>",
      falcon: "<:tnthawk:253728670299062272>",
      ferret: "<:tntferret:253727216398106625>",
      skunk: "<:tntskunk:253730191514402816>",
      snake: "<:tntsnake:253732160916291594>",
      chameleon: "<:tntchameleon:253730191556214784>",
      wolf: "<:tntwolf:253730191556214795>",
      fox: "<:tntfox:253728670009524226>",
      badger: "<:tntbadger:230094635903483904>",
      boar: "<:tntboar:230096277541486592>",
      owl: "<:tntowl:230095674148913164>",
      machinegun: "<:tntmachinegun:253571159264591873>",
      landmine: "<:tntlandmine:253570337340522496>",
      balloon: "<:tntballoon:253570336967229450>",
      artillery: "<:tntarty:253571159252140032>",
      barbedwire: "<:tntbarbedwire:259083677571481611>",
      bellafide: "<:bellafide:245224151508320256>",
      hopper: "<:hopper:245224151432822795>",
      archi: "<:archimedes:245224151353262080>",
      qm: "<:quartermaster:245224151470571521>",
      //Other
      wip: "<:wip:247433292587073536>",
      discord: "<:logo_discord:266353098887397386>",
    },

    // DON'T DELETE These
    // ==================
    consts: {
      MAX_TIMEOUT: 10080, //Max mute period, 1 week for now
    },
  };
};
