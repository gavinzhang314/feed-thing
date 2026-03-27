"use strict";

import { FeedItem, Channel, getChannelList } from "../lib.js";

let messageDiv = document.getElementById("message");

async function createFeed() {
    let feedDiv = document.getElementById("feed");
    let channelList = await getChannelList();
    // is Promise.all really necessary here?
    let feedPromises = []
    for (const channel of channelList) {
        feedPromises.push(Channel.getFeedFromUrl(channel.url).then(c => c.items));
    }
    let itemArrays = await Promise.all(feedPromises);
    let feedItems = itemArrays.flat();
    feedItems.sort((a,b) => (b.pubDate.getTime() - a.pubDate.getTime()));
    if (feedItems.length === 0) {
        messageDiv.removeChild(messageDiv.firstChild);
        messageDiv.append(document.createTextNode("No RSS feed items."));
    } else {
        messageDiv.setAttribute("hidden", "");
        for (const feedItem of feedItems) {
            feedDiv.append(feedItem.toHTMLElement());
        }
    }
}

createFeed().catch(console.error);