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
const authority = {
  steps: [],
  doc: DOMParser.fromSchema(mySchema).parse(document.querySelector("#content")),
  receiveSteps(version, steps, clientIDs) {
    if (version != this.steps.length) return

    // Apply and accumulate new steps
    steps.forEach(step => {
      this.doc = step.apply(this.doc).doc
      this.steps.push(step)
      this.stepClientIDs.push(clientID)
    })
    // Signal listeners
    this.onNewSteps.forEach(function(f) { f() })
  },
  onNewSteps: [],
  stepsSince(version) {
    return {
      steps: this.steps.slice(version),
      clientIDs: this.stepClientIDs.slice(version)
    }
  }
};

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
