let fs = require("fs");

module.exports = {
  u: JSON.parse(fs.readFileSync("assets/units.json", "utf8"))
};
