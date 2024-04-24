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
  const pc = new RTCPeerConnection();
  window.pc = pc;
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("candidate", event.candidate);
    }
  };
  const chat = pc.createDataChannel("chat");
  chat.onmessage = (event) => console.log("message", event.data);
  chat.send("Hello, world! from client");
  chat.onopen = () => console.log("open");
  chat.onclose = () => console.log("close");
  chat.onerror = (event) => console.log("error", event);
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

  console.log("offer", offer.sdp.length, offer.sdp);

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
    await sleep(5000);
    response = await fetch(url);
    console.log("fetch", tries, response.status, response.statusText);
  }
  const answer = await response.text();

  console.log("answer1", answer.length, answer);
  await pc.setRemoteDescription({ type: "answer", sdp: answer });
}
