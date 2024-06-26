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
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("candidate", event.candidate);
    }
  };
  pc.ondatachannel = (event) => {
    const chat = event.channel;
    chat.onmessage = (event) => console.log("message", event.data);
    chat.send("Hello, world! from client");
  };
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
  // Attempt to fetch from the GitHub repository through jsdelivr
  const [ghUser, ghRepo, ghBranch] = repo.split("/");
  const url = `https://cdn.jsdelivr.net/gh/${ghUser}/${ghRepo}@${ghBranch}/offers/${uuid}.txt`;
  const response = await fetch(url);
  const answer = await response.text();
  console.log("answer1", answer.length, answer);
  pc.setRemoteDescription({ type: "answer", sdp: answer });

  
}
