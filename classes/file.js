const uuid = require("uuid");
const Resource = require("../models/resource");
const Doc = require("../models/doc");

const { Schema } = require("prosemirror-model");
const { schema: basicSchema } = require("prosemirror-schema-basic");
const { addListNodes } = require("prosemirror-schema-list");

const WebSocketClass = require("./webSocketClass");

class fileClass {
  //constructor
  constructor(WebSocket, server) {
    this.WebSocket = WebSocket;
    this.server = server;
    this.webSocketClass = new WebSocketClass();

    this.mySchema = new Schema({
      nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block"),
      marks: basicSchema.spec.marks,
    });

    this.initialDoc = this.mySchema.nodeFromJSON({
      type: "doc",
      content: [{ type: "paragraph", content: [] }],
    });
  }
  //create new file
  async createNewFile(req, res) {
    if (req.user) {
      const resourceId = uuid.v4();
      const docId = uuid.v4();

      await Resource.create({
        resourceId: resourceId,
        userId: req.user.userId,
        docId: docId,
      });

      const docJson = this.initialDoc.toJSON();

      const doc = await Doc.create({
        docId: docId,
        doc: docJson,
        userId: req.user.userId,
      });
      this.initiateWebSocket(doc.doc, docId);

      res.render("index", {
        docId: docId,
        docName: doc.name,
        user: req.user,
      });
    } else {
      res.redirect("/");
    }
  }

  //view saved files
  async viewFile(req, res) {
    const doc = await Doc.find({ docId: req.params.docId });

    if (req.user) {
      if (doc[0]) {
        this.initiateWebSocket(doc[0].doc, req.params.docId);
      } else {
        return res.status(404).send("404: File not found");
      }
      return res.render("index", {
        docId: req.params.docId,
        docName: doc[0].name,
        user: req.user,
      });
    } else {
      res.redirect("/");
    }
  }
  // initiate ws
  initiateWebSocket(doc, docId) {
    this.webSocketClass.init(doc, this.WebSocket, this.server, docId);
  }
}

module.exports = fileClass;
