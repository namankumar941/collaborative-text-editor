const express = require("express");
const User = require("../models/user");
const Resource = require("../models/resource");
const router = express.Router();

const uuid = require("uuid");
//----------------------------------------------class----------------------------------------------

//----------------------------------------------routes----------------------------------------------

//get request to add editor
router.get("/:docId", (req, res) => {
  return res.render("addEditor",{
    docId:req.params.docId
  });
});

//post request to add editor
router.post("/:docId", async (req, res) => {
  const user = await User.find({email:req.body.email})
  if(user[0]){
    const resourceId = uuid.v4();
      await Resource.create({
        resourceId: resourceId,
        userId: user[0].userId,
        docId: req.params.docId,
      });
      res.redirect(`/file/${req.params.docId}`)
  }else{
    res.render("addEditor",{
      error:"Email not found",
      docId: req.params.docId
    })
  }
  });
  
module.exports = router;
