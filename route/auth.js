const User = require("../models/user");
const passport = require("passport");
const googleStrategy = require("passport-google-oauth20");
const express = require("express");
const { clientId, clientSecret } = require("../secretData");

//----------------------------------------------class----------------------------------------------

class Authentication {
  constructor() {
    this.initPassport();
  }
  // Initialize passport configuration
  initPassport() {
    // Serialize user information into the session
    passport.serializeUser((user, done) => {
      done(null, user.userId);
    });
    //deserialize User
    passport.deserializeUser((userId, done) => {
      User.find({ userId: userId }).then((user) => {
        done(null, user[0]);
      });
    });

    //creating user using google strategy
    passport.use(
      new googleStrategy(
        {
          clientID: clientId,
          clientSecret: clientSecret,
          callbackURL: "/auth/google/redirect",
        },
        async (accessToken, refreshToken, profile, done) => {
          const currentUser = await User.find(
            { email: profile._json.email },
            "userId"
          );
          
          if (!currentUser[0]) {
            const newUser = await User.create({
              userId: profile.id,
              email: profile._json.email,
              name: profile._json.name,
            });

            return done(null, { userId: newUser.userId });
          }else {
            done(null, currentUser[0]);
          }
        }
      )
    );
  }

  //----------------------------------------------routes----------------------------------------------

  // Set up routes for authentication
  setupRoutes() {
    const router = express.Router();

    // Route to initiate Google authentication
    router.get(
      "/google",
      passport.authenticate("google", { scope: ["email", "profile"] })
    );

    // Route to handle Google OAuth callback
    router.get(
      "/google/redirect",
      passport.authenticate("google", { failureRedirect: "/" }),
      (req, res) => {
        res.redirect("/");
      }
    );

    return router;
  }
}

module.exports = Authentication;
