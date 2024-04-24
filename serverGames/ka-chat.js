export class KAChat {
  constructor() {
    // Message format: { author: string, message: string, timestamp: Date }
    this.last100messages = [];
  }

  eventHandler(type, data, peer, peers) {
    switch (type) {
      case "connect":
        console.log("Connected to peer", peer.uuid);
        break;
      case "data":
        const dataStr = data.toString();
        console.log("Received message from peer", peer.uuid, ":", dataStr);

        // Possible data formats
        //   "msg|Hello, world!"
        //   "last-100"
        if (dataStr.startsWith("msg|")) {
          const message = {
            author: peer.uuid,
            message: dataStr.slice(4),
            timestamp: new Date(),
          };
          this.last100messages.push(message);
          if (this.last100messages.length > 100) {
            this.last100messages.shift();
          }
          for (const peer of peers) {
            peer.send("msg|" + JSON.stringify(message));
          }
        } else if (dataStr === "last-100") {
          peer.send("last-100|" + JSON.stringify(this.last100messages));
        }
      case "error":
        console.error("Error:", data);
        break;
    }
  }
}
