Fb = require("firebase/app");
require('firebase/database');

module.exports = (bot) => {
  const { vars: x } = bot.PB;
  let fire = false;

  if (process.env.FBKEY2) {
    Fb.initializeApp(x.firebasecfg);

    fire = {
      soldiers: Fb.database().ref("players"),
      quotes: Fb.database().ref("quote")
    };

    console.log("Public Firebase initialized!");
  } else {
    console.warn("Public Firebase not initialized.");
  }

  return {
    db: fire || null,
	  DEFAULT_CURRENCY_AMOUNT: 20,
  
    getProp(userID, prop) {
      // Checks userID in database, should return
      // null if user didn't exist or on Firebase error
      return new Promise((res, rej) => {
        this.db?.soldiers.child(userID).once("value", function(user){
          res(user.val()?.[prop] || false);
        }, function(err){
          console.error(err);
          rej(false);
        });
      });
    }
  }
}