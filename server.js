import Turn from "node-turn";
import simpleGit from "simple-git";
import fs from "fs";
import wrtc from "wrtc";

// Step 2. Listen with TURN server and commit the file
const listenToPort = 47777;
const server = new Turn({
  listeningPort: listenToPort,
  authMech: "long-term",
  credentials: {
    username: "password",
  },
});
const git = simpleGit();
const incompleteOffers = {}; // { uuid1: [packet1, packet2, ...] }
server.onSdpPacket = async (contents) => {
  console.log("sdp", JSON.stringify(contents));
  try {
    // Step 2.1: Parse the packet
    const [version, uuid, packetNum, numPackets, ...rest] = contents.split(":");
    const data = rest.join(":");
    if (version !== "zeta6" || !uuid || isNaN(packetNum) || isNaN(numPackets)) {
      throw new Error(`Malformed packet: ${contents}`);
    }

    // Step 2.2: Assemble the packet. If all packets are received, create the connection
    if (!incompleteOffers[uuid]) {
      incompleteOffers[uuid] = [];
    }
    incompleteOffers[uuid][packetNum] = data;
    for (let i = 0; i < numPackets; i++) {
      if (!incompleteOffers[uuid][i]) return;
    }
    const offer = incompleteOffers[uuid].join("");
    delete incompleteOffers[uuid];

    // Step 2.3: Create the connection
    console.log("start 2.3: offer", offer.length, offer);
    const pc = new wrtc.RTCPeerConnection();
    await pc.setRemoteDescription({ type: "offer", sdp: offer });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    const chat = pc.createDataChannel("chat");
    chat.onmessage = (event) => console.log("message", event.data);
    chat.onopen = (event) => console.log("open", event);
    chat.onclose = (event) => console.log("close", event);
    chat.onerror = (event) => console.log("error", event);
    pc.onconnectionstatechange = (event) => {
      console.log("connection state", event);
      chat.send("Hello, world! from server");
    };

    // Step 2.4: Create the file
    console.log("step 2.4 start", uuid);
    const res = await fs.promises.writeFile(`offers/${uuid}.txt`, answer.sdp);
    console.log("sep 2.4 done, created file ", res);

    // Step 2.5: Commit the file
    console.log("step 2.5 start");
    git.addConfig("user.email", "user@example.com");
    git.addConfig("user.name", "User");
    git.add(`.`); // Add all files
    git.commit(`Add file ${uuid}.txt`);
    console.log("step 2.5 done");

    // Step 2.6: Push the file
    console.log("step 2.6 start");
    git.push();
    console.log("step 2.6 done");

    // Step 2.7: Clean up
    git.rm(`./offers/${uuid}.txt`);
    console.log("step 2.7 done");
  } catch (e) {
    console.error(e);
  }
};
server.start();
console.log("TURN server listening on port", listenToPort);
