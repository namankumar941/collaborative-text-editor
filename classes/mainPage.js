const User = require("../models/user");

class MainPage {
  async viewMainPage(req, res) {
    if (!req.user) {
      return res.render("main");
    }
    const user = await User.find({ userId: req.user.userId }, "name");
    return res.render("main", {
      user: {
        userName: user[0].name,
      },
    });
  }

  logOut(req, res){
    req.logout((err) => {
      if (err) {
        return res.status(500).send("Logout failed.");
      }
    });
    return res.render("main");
  }
}


module.exports = MainPage;