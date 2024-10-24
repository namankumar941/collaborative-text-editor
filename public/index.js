import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, DOMParser } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { exampleSetup } from "prosemirror-example-setup";
import {collab , sendableSteps , getVersion , receiveTransaction} from "prosemirror-collab";

// Mix the nodes from prosemirror-schema-list into the basic schema
const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
  marks: schema.spec.marks,
});

// Collaborative authority (mock implementation)
class Authority {
  constructor(doc) {
    this.doc = doc;
    this.steps = [];
    this.stepClientIDs = []
    this.clients = new Set();
  }

  receiveSteps(version, steps, clientID) {
    if (version !== this.steps.length) return;

    steps.forEach(stepJSON => {
      const step = Step.fromJSON(mySchema, stepJSON);
      this.doc = step.apply(this.doc).doc;
      this.steps.push(step);
      this.stepClientIDs.push(clientID);
    });

    this.notifyClients();
  }

  notifyClients() {
    const message = JSON.stringify({
        type: 'update',
        doc: this.doc.toJSON(),
        steps: this.steps.map(step => step.toJSON()),  // Convert steps to JSON
        clientIDs: this.stepClientIDs.slice()
    });
    console.log("Sending update message:", message); // Log the message

    this.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

  addClient(client) {
    this.clients.add(client);
  }

  removeClient(client) {
    this.clients.delete(client);
  }
}
const initialDoc = mySchema.nodeFromJSON({ type: 'doc', content: [{ type: 'paragraph', content: [] }] });
const authority = new Authority(initialDoc);

function collabEditor(authority, place) {
  let view = new EditorView(place, {
    state: EditorState.create({
      doc: authority.doc,
      plugins: [collab({ version: authority.steps.length })]
        .concat(exampleSetup({ schema: mySchema })) // Include example setup
    }),
    dispatchTransaction(transaction) {
      let newState = view.state.apply(transaction);
      view.updateState(newState);
      let sendable = sendableSteps(newState);
      if (sendable) {
        authority.receiveSteps(sendable.version, sendable.steps, sendable.clientID);
      }
    }
  });

  authority.onNewSteps.push(function () {
    let newData = authority.stepsSince(getVersion(view.state));
    view.dispatch(
      receiveTransaction(view.state, newData.steps, newData.clientIDs)
    );
  });

  return view;
}

// Initialize the collaborative editor
window.view = collabEditor(authority, document.querySelector("#editor"));
