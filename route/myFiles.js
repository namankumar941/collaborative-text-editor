const express = require("express");
const router = express.Router();

const Doc = require("../models/doc");
const Resource = require("../models/resource");
//----------------------------------------------class----------------------------------------------
class MyFiles {
  //display all files
  async allFiles(req, res) {
    if (!req.user) {
      return res.redirect("/");
    }
    const resource = await Resource.find({ userId: req.user.userId }, "docId");
    let docs = [];
    for (let reso of resource) {
      const doc = await Doc.find({ docId: reso.docId }, "docId , name");
      docs.push(doc[0]);
    }
    res.render("myFiles", {
      user: {
        userName: req.user.name,
      },
      docs: docs,
    });
  }
  //open file
  myFile(req, res) {
    res.redirect(`/file/${req.params.docId}`);
  }
  //get to change file name
  getEditName(req, res) {
    res.render("editName", {
      user: {
        userName: req.user.name,
      },
      docId: req.params.docId,
    });
  }
  //post change file name
  async postEditName(req, res) {
    await Doc.updateOne(
      { docId: req.params.docId },
      { $set: { name: req.body.name } }
    );
    res.redirect(`/file/${req.params.docId}`);
  }
}
const myFilesClass = new MyFiles();
//----------------------------------------------routes----------------------------------------------

//get request to view all files
router.get("/", myFilesClass.allFiles.bind(myFilesClass));
//get request to view file
router.get("/:docId", myFilesClass.myFile.bind(myFilesClass));
//get request to edit file name
router.get("/editName/:docId", myFilesClass.getEditName.bind(myFilesClass));
//post request to edit file name
router.post("/editName/:docId", myFilesClass.postEditName.bind(myFilesClass));

module.exports = router;
