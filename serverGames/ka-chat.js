import fs from "fs";

export class KAChat {
  constructor() {
    // Message format: { author: string, content: string, timestamp: Date }
    this.last100messages = [];
  }

  eventHandler(type, data, peer, peers) {
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
          fs.appendFile(
            "./logs/chat.log",
            `${message.timestamp.toISOString()} ${author}: ${content}\n`,
            (err) => {
              if (err) {
                console.error("Failed to write to chat.log:", err);
              }
            }
          );
        }
      case "error":
        console.error("Error:", data.toString());
        break;
    }
  }
}
