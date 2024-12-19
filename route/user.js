const express = require("express");
const router = express.Router();

//----------------------------------------------class----------------------------------------------

//----------------------------------------------routes----------------------------------------------

//get request to login user
router.get("/login", (req, res) => {
  return res.render("login");
});

module.exports = router;
