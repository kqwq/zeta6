async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Step 1
/**
 * First step in connecting to a multiplayer server on Khan Academy.
 *
 * @param {string} connectionString
 * - Connection string in the format of ip:port:github-user/github-repo/branch
 * - Example: 123.1.1.1:4444:kqwq/zeta6/dev
 */
async function connect(connectionString) {
  // Step 1.1: Prepare packets for the connection offer
  const [ip, port, repo] = connectionString.split(":");
  const uuid = Math.random().toString(36).substring(2, 15);
  const peer = new SimplePeer({
    initiator: true,
    config: {
      iceServers: [
        {
          urls: [`turn:${ip}:${port}`],
          username: "1",
          credential: "password",
        },
      ],
    },
  });

  window.peer = peer;
  const offer = await new Promise((resolve) => {
    peer.on("signal", (offer) => {
      resolve(offer);
    });
  });
  console.log("offer", offer);

  const offerPackets = [];
  const maxPacketSize = 200; // Must fit in 256 bytes
  let i = 0;
  let numPackets = Math.ceil(offer.sdp.length / maxPacketSize);
  let packetNum = 0;
  while (i < offer.sdp.length) {
    const data = offer.sdp.substring(i, i + maxPacketSize);
    offerPackets.push(`zeta6:${uuid}:${packetNum}:${numPackets}:${data}`);
    packetNum++;
    i += maxPacketSize;
  }

  // Step 1.2: Send the offer to the TURN server
  for (const packet of offerPackets) {
    const disposablePC = new RTCPeerConnection({
      iceServers: [
        {
          urls: [`turn:${ip}:${port}`],
          username: packet,
          credential: "1",
        },
      ],
      iceCandidatePoolSize: 1,
    });
  }

  // Step 3 (step 2 is in the server code)
  // Attempt to fetch from the GitHub repository through jsdelivr every 5 seconds for 8 tries
  const [ghUser, ghRepo, ghBranch] = repo.split("/");
  const url = `https://cdn.jsdelivr.net/gh/${ghUser}/${ghRepo}@${ghBranch}/offers/${uuid}.txt`;
  let response;
  let tries = 0;
  while (!response?.ok) {
    tries++;
    if (tries > 8) {
      throw new Error(`Failed to fetch: ${url} after ${tries} tries`);
    }
    await sleep(3000);
    response = await fetch(url);
    console.log("fetch", tries, response.status, response.statusText);
  }
  const answer = await response.text();

  console.log("answer1", answer.length, answer);
  peer.signal({ type: "answer", sdp: answer });
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
}
