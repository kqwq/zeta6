
import Turn  from "node-turn";


// Step 2. Listen with TURN server and commit to GitHub
const listenToPort = 47777;
const server = new Turn({
  listeningPort: listenToPort,
  authMech: "long-term",
  credentials: {
    username: "password",
  },
});
server.onSdpPacket = (contents) => {
  console.log("sdp", JSON.stringify(contents));
};
server.start();
console.log("TURN server listening on port", listenToPort);