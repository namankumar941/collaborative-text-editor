const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const passport = require("passport");
const cookieSession = require("cookie-session");
const { secretKey } = require("./secretData");
const session = require("express-session");
const User = require("./models/user");
const Authentication = require("./route/auth");

const app = express();
const port = 8000;

// set view engine as ejs and set path location of ejs file
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

// Serve static files
//app.use(express.static(path.join(__dirname, 'public')));
// import all route
const userRoute = require("./route/user");

// Middleware for parsing request body
app.use(express.urlencoded({ extended: false }));

//middleware to initialize passport and creating cookie
app.use(
  session({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Create an instance of the Authentication class
const auth = new Authentication();

//----------------------------------------------class----------------------------------------------

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
}
//created class instance
const mainPage = new MainPage();

//----------------------------------------------routes----------------------------------------------

//get request for main page
app.get("/", mainPage.viewMainPage.bind(mainPage));

//get request for new file
app.get("/newFile",(req,res)=>{
  res.sendFile(path.join(__dirname, 'views/index.html'))
})
// get request to log out user
app.get("/logout", async (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).send("Logout failed.");
    }
  });
  return res.render("main");
});

//middleware to redirect url to route
app.use("/user", userRoute);

// Set up authentication routes
app.use("/auth", auth.setupRoutes());

// connect mongo Db
mongoose
  .connect("mongodb://localhost:27017/Collab-Edit")
  .then(() => console.log("mongo db connected"))
  .catch((err) => console.log("mongo connection error", err));

// starting server
app.listen(port, () => console.log("server started"));
