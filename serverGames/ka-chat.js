import fs from "fs";

export class KAChat {
  constructor() {
    // Message format: { author: string, content: string, timestamp: Date }
    this.last100messages = [];
  }

  async eventHandler(type, data, peer, peers) {
    switch (type) {
      case "connect":
        console.log("Connected to peer", peer.uuid);
        peer.send("history|" + JSON.stringify(this.last100messages));
        break;
      case "data":
        const dataStr = data.toString();
        console.log("Received message from peer", peer.uuid, ":", dataStr);

        // Possible data formats
        //   "msg|Hello, world!"
        //   "last-100"
        if (dataStr.startsWith("broadcast|")) {
          const [_, author, content] = dataStr.split("|");
          const message = {
            author,
            content,
            timestamp: new Date(),
          };
          this.last100messages.push(message);
          if (this.last100messages.length > 100) {
            this.last100messages.shift();
          }
          for (const peer of peers) {
            peer.send(`msg|${author}|${content}`);
          }
          // Log to ./logs
          await fs.promises.appendFile(
            "./logs",
            `${message.timestamp.toISOString()} ${author}: ${content}\n`
          );
        }
      case "error":
        console.error("Error:", data);
        break;
    }
  }
}