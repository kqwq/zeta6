// Step 1
/**
 * First step in connecting to a multiplayer server on Khan Academy.
 *
 * @param {string} connectionString - Connection string in the format of ip:port like 123.1.1.1:4444
 */
function connect(connectionString) {
  new RTCPeerConnection({
    iceServers: [
      {
        urls: [`turn:${connectionString}`],
        username: "testing-ok v1",
        credential: "1",
      },
    ],
    iceCandidatePoolSize: 1,
  });
}

// Step 3 (step 2 is in the server code)
