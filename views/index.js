import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { exampleSetup } from "prosemirror-example-setup";
import { collab, sendableSteps, receiveTransaction } from "prosemirror-collab";
import { Step } from "prosemirror-transform";

const mySchema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block"),
  marks: basicSchema.spec.marks,
});
//----------------------------------------------CollabEditor Class----------------------------------------------
class CollabEditor {
  constructor() {
    this.view = null;
  }
  // ........................Initial editor view........................
  initEditor(doc) {
    const state = this.editorState(doc);

    this.view = new EditorView(document.querySelector("#editor"), {
      state: state,
      dispatchTransaction: (transaction) => {
        const newState = this.view.state.apply(transaction);
        this.sendStep(newState);
        this.view.updateState(newState);
      },
    });
  }

  // ........................Initialize editor state........................
  editorState(doc) {
    return EditorState.create({
      doc: doc,
      plugins: [collab({ version: 0 })].concat(
        exampleSetup({ schema: mySchema })
      ),
    });
  }
  //........................update view........................
  receiveTransaction(transaction) {
    const newState = this.view.state.apply(transaction); // Apply the transaction to the editor state
    this.view.updateState(newState); // Update the editor view with the new state
  }
  // ........................Send changes to server as steps........................
  sendStep(newState) {
    const sendable = sendableSteps(newState);
    if (sendable) {
      CollabWebSocket.sendData(sendable);
    }
  }
}

//----------------------------------------------CollabWebSocket Class----------------------------------------------
class CollabWebSocket {
  static ws;
  static steps = [];
  static collabEditor = null; // Add this to store reference to CollabEditor instance
  static localChange = false;

  static init(collabEditorInstance) {
    this.collabEditor = collabEditorInstance; // Set the reference to the CollabEditor
    this.openConnection();
    this.onMessage();

    // WebSocket error handler
    this.ws.onerror = async (error) => {
      console.error("WebSocket error:", error);
    };

    // WebSocket close handler
    this.ws.onclose = async () => {
      console.log("WebSocket connection closed");
    };
  }

  // ........................Open WebSocket connection........................
  static openConnection() {
    this.ws = new WebSocket("ws://localhost:8000");

    this.ws.onopen = () => {
      console.log("WebSocket connection established");
    };
  }

  // ........................WebSocket message handler........................
  static onMessage() {
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "init") {
        this.initialDoc(data);
      } else if (data.type === "update") {
        this.updateData(data);
      } else {
        console.error("Received invalid message:", data);
      }
    };
  }

  // ........................Handle initial document........................
  static initialDoc(data) {
    this.socId = data.socId;
    this.doc = mySchema.nodeFromJSON(data.initialDoc);
    // Initialize editor view
    this.collabEditor.initEditor(this.doc);
  }

  // ........................Handle incoming updates........................
  static updateData(data) {
    const step = Step.fromJSON(mySchema, data.steps);
    const transaction = this.collabEditor.view.state.tr;

    transaction.step(step);
    this.localChange = true;
    this.collabEditor.receiveTransaction(transaction);
    this.localChange = false;
  }

  // ........................Send steps to server........................
  static sendData(sendable) {
    if (this.localChange) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("sendable.steps", sendable.steps[sendable.steps.length - 1]);
      console.log(
        "this.steps.length",
        this.steps.length,
        "sendable.steps.length",
        sendable.steps.length
      );
      if (this.steps.length == sendable.steps.length) return;
      this.steps.push(sendable.steps[sendable.steps.length - 1]);
      this.ws.send(
        JSON.stringify({
          version: sendable.version,
          steps: sendable.steps[sendable.steps.length - 1],
        })
      );
    }
  }
}

// Initialize the editor and WebSocket
CollabWebSocket.init(new CollabEditor());