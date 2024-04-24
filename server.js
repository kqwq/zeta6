import Turn from "node-turn";
import simpleGit from "simple-git";
import fs from "fs";
import SimplePeer from "simple-peer";

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
  } catch (e) {
    console.error(e);
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
  const peer = new SimplePeer({
    initiator: false,
  });
  await peer.signal({ type: "offer", sdp: offer });
  const answer = await new Promise((resolve) => {
    peer.on("signal", (answer) => {
      resolve(answer);
    });
  });
  peer.on("connect", () => {
    const chat = peer;
    console.log("open");
    chat.send("Hello, world! from client");

    chat.on("data", (data) => {
      console.log("message", data.toString());
    });

    chat.on("close", () => {
      console.log("close");
    });

    chat.on("error", (err) => {
      console.log("error", err);
    });
  });

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
};
server.start();
console.log("TURN server listening on port", listenToPort);
