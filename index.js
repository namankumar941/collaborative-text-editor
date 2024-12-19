const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const passport = require("passport");
const { secretKey } = require("./secretData");
const session = require("express-session");

// import all route
const userRoute = require("./route/user");
const Authentication = require("./route/auth");
const editorRoute = require("./route/addEditor");
const myFilesRoute = require("./route/myFiles");

const app = express();
const port = 8000;

const http = require("http");
const WebSocket = require("ws");
const server = http.createServer(app);
// set view engine as ejs and set path location of ejs file
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

// Middleware for parsing request body
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "views")));

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

//created class instance
const MainPage = require("./classes/mainPage");
const FileClass = require("./classes/file");
const auth = new Authentication();
const mainPage = new MainPage();
const fileClass = new FileClass(WebSocket, server);

//----------------------------------------------routes---------------------------------------------------------
//get request for main page
app.get("/", mainPage.viewMainPage.bind(mainPage));
//get request for new file
app.get("/newFile", fileClass.createNewFile.bind(fileClass));
//get to open file
app.get("/file/:docId", fileClass.viewFile.bind(fileClass));
// get request to log out user
app.get("/logout", mainPage.logOut.bind(mainPage));
//middleware to redirect url to route
app.use("/user", userRoute);
app.use("/add", editorRoute);
app.use("/myFiles", myFilesRoute);
// Set up authentication routes
app.use("/auth", auth.setupRoutes());
//----------------------------------------------mongo Db connection---------------------------------------------
mongoose
  .connect("mongodb://127.0.0.1:27017/Collab-Edit")
  .then(() => console.log("mongo db connected"))
  .catch((err) => console.log("mongo connection error", err));
//----------------------------------------------server----------------------------------------------------------
server.listen(port, () => console.log("server started"));