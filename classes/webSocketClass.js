const { Schema, Node } = require("prosemirror-model");
const { schema: basicSchema } = require("prosemirror-schema-basic");
const { addListNodes } = require("prosemirror-schema-list");
const { Step } = require("prosemirror-transform");
const uuid = require("uuid");
const Doc = require("../models/doc");
const { createClient } = require("redis");
const activeSockets = new Map();
const client = createClient();

const mySchema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block"),
  marks: basicSchema.spec.marks,
});
class WebSocketClass {
  //........................class constructor................................
  constructor() {
    this.initialDoc = null;
    this.doc = this.initialDoc;
    this.docId = null;
    this.socId = null;
    this.WebSocket = null;
    this.wss = null;
    this.stepCount=0
    this.connectClient()
  }
  //........................connect to redis client.......................
  async connectClient(){
    await client.connect();
  }
  //........................function to initialize ws.........................
  async init(doc, WebSocket, server, docId) {
    this.docId = docId;
    this.socId = uuid.v4();
    const redisDoc = await client.get(`docId:${this.docId}`)
    if(redisDoc){
      doc=redisDoc
    }
    const parsedDoc = typeof doc === "string" ? JSON.parse(doc) : doc;
    this.initialDoc = Node.fromJSON(mySchema, parsedDoc);
    this.doc = this.initialDoc;
    if(redisDoc){
      this.updateDoc()
    }
    if (!this.wss) {
      this.openSocketServer(WebSocket, server);
    }
  }
  //........................open ws server....................................
  openSocketServer(WebSocket, server) {
    this.WebSocket = WebSocket;
    this.wss = new WebSocket.Server({ server });
    this.wss.on("connection", (ws) => {
      console.log("connected");
      this.addClient(ws);
      this.initialDocument(ws);
      this.socketMessage(ws);
      this.closeSocketServer(ws, this.socId);
    });
  }
  //........................add clients who can edit doc......................
  async addClient(ws) {
    await client.sAdd(`socId:docId:${this.docId}`, this.socId);
    activeSockets.set(this.socId, ws);
  }
  //........................send initial document to client...................
  initialDocument(ws) {
    const message = {
      type: "init",
      initialDoc: this.initialDoc,
      socId: this.socId,
    };
    ws.send(JSON.stringify(message));
  }
  //........................message received through socket...................
  socketMessage(ws) {
    ws.on("message", async (message) => {
      const { version, steps } = JSON.parse(message);
      this.applyStep(steps, ws, version);
    });
  }
  //........................apply changes to doc.............................
  async applyStep(step, ws, version) {
    step = Step.fromJSON(mySchema, step);    
    const timePeriod = 60000;
    const currentTime = new Date();
    const lastUpdated = await client.get(`lastUpdated:${this.docId}`)
    let lastUpdatedTime
    if(!lastUpdated){
      lastUpdatedTime = currentTime
    }else{
      lastUpdatedTime = new Date(lastUpdated);
    }
    
    if (!(step instanceof Step)) {
      console.error("Invalid step:", step);
      return; // Skip invalid steps
    }
    this.stepCount++
    this.doc = step.apply(this.doc).doc;
    await client.set(`docId:${this.docId}`, JSON.stringify(this.doc));

    if(this.stepCount == 20 || (currentTime - lastUpdatedTime) > timePeriod){
      this.stepCount=0
      this.updateDoc();
    }
    this.sendStep(version, ws, step);
  }
  //........................update document..................................
  async updateDoc() {
    const timestamp = new Date().toISOString();
    await client.set(`lastUpdated:${this.docId}`, timestamp);
    await Doc.updateOne(
      { docId: this.docId },
      { $set: { doc: this.doc.toJSON() } }
    );
  }
  //........................send steps to UI through socket..................
  async sendStep(version, ws, step) {
    const sockets = await client.sMembers(`socId:docId:${this.docId}`);
    for (let socket of sockets) {
      const wss = activeSockets.get(socket);
      if (!wss) {
        await client.sRem(`socId:docId:${this.docId}`, socket)
      } else if (wss !== ws && wss.readyState === this.WebSocket.OPEN) {
        try {
          wss.send(
            JSON.stringify({
              type: "update",
              version: version,
              steps: step,
            })
          );
        } catch (err) {
          console.log("error", err);
        }
      }
    }
  }
  //........................close socket connection..........................
  closeSocketServer(ws, socId) {
    ws.on("close", async () => {
      await client.sRem(`socId:docId:${this.docId}`, socId);
      activeSockets.delete(socId);
      console.log("disconnected");
    });
  }
}

module.exports = WebSocketClass;