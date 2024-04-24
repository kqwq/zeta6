import Turn from "node-turn";
import simpleGit from "simple-git";
import fs from "fs";
import SimplePeer from "simple-peer";
import wrtc from "wrtc";

// Step 2. Listen with TURN server and commit the file
export class zeta6server {
  /**
   *
   * @param {number} port - the port to listen on, default 47777
   * @param {function} eventHandler - the function to handle events, default console.log.
   *   eventHandler is a function that takes in (type, data, peer, peers)
   *   | type is one of "start", "connect", "data", "error", "open", "close"
   *   | data is the data associated with the event
   *   | peer is a SimplePeer object
   *   | peers is an array of connected SimplePeer objects
   */
  constructor(port = 47777, eventHandler) {
    this.port = port;
    const simpleEventHandler = (type, data, peer, peers) => {
      console.log(type, data, "(peer)", `(${peers.length} peers connected)`);
    };
    this.eventHandler = eventHandler || simpleEventHandler;
    this.turn = new Turn({
      listeningPort: port,
      authMech: "long-term",
      credentials: {
        username: "password",
      },
    });
    this.incompleteOffers = {}; // { uuid1: [packet1, packet2, ...] }
    this.peers = [];
    this.turn.onSdpPacket = async (contents) => {
      if (!contents.startsWith("zeta6:")) return;

      // Step 2.1: Parse the packet
      const [version, uuid, packetNum, numPackets, ...rest] =
        contents.split(":");
      const data = rest.join(":");
      if (
        version !== "zeta6" ||
        !uuid ||
        isNaN(packetNum) ||
        isNaN(numPackets)
      ) {
        this.eventHandler("error", "Invalid packet", null, this.peers);
        return;
      }

      // Step 2.2: Assemble the packet. If all packets are received, create the connection
      if (!this.incompleteOffers[uuid]) this.incompleteOffers[uuid] = [];
      this.incompleteOffers[uuid][packetNum] = data;
      for (let i = 0; i < numPackets; i++) {
        if (!this.incompleteOffers[uuid][i]) return;
      }
      const offer = this.incompleteOffers[uuid].join("");
      delete this.incompleteOffers[uuid];

      // Step 2.3: Create the connection
      const peer = new SimplePeer({
        initiator: false,
        wrtc: wrtc,
      });
      peer.uuid = uuid;
      await peer.signal({ type: "offer", sdp: offer });
      const answer = await new Promise((resolve) => {
        peer.on("signal", (answer) => {
          resolve(answer);
        });
      });
      peer.on("connect", () => {
        this.eventHandler("connect", null, peer, this.peers);
        this.peers.push(peer);
        peer.on("data", (data) =>
          this.eventHandler("data", data, peer, this.peers)
        );
        peer.on("error", (err) =>
          this.eventHandler("error", err, peer, this.peers)
        );
        peer.on("open", () =>
          this.eventHandler("open", null, peer, this.peers)
        );
        peer.on("close", () => {
          this.peers = this.peers.filter((p) => p !== peer);
          this.eventHandler("close", null, peer, this.peers);
        });
      });

      // Step 2.4: Push ${uuid}.js to the GitHub repository
      const code = `window.offer = ${JSON.stringify(answer.sdp)};`;
      await fs.promises.writeFile(`offers/${uuid}.js`, code);
      const git = simpleGit();
      git.addConfig("user.email", "user@example.com");
      git.addConfig("user.name", "User");
      git.add(`.`); // Add all files
      git.commit(`Add file ${uuid}.js`);
      git.push();
      git.rm(`./offers/${uuid}.txt`);
    };
    this.turn.start();
    this.eventHandler("start", `Listening on port ${port}`, null, this.peers);
  }
}
