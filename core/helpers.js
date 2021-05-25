module.exports = (bot) => {
  const { vars: x } = bot.PB;
  const modsUp = [x.admin, x.adminbot, x.combot, x.mod];

  return {
    hasPerms(roles, reqRoles) {
      for (const roleID of reqRoles) {
        if (roles.includes(roleID)) return true;
      }
  
      return false;
    },
    hasModPerms(roles) {
      return this.hasPerms(roles, modsUp);
    },
    getUser(txt) {
      return txt?.match(/\b\d{10,}\b/g)[0];
    }
  }
}