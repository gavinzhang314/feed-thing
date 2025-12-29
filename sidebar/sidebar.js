"use strict";

import { getChannelList } from "../lib.js";

const parser = new DOMParser();

let messageDiv = document.getElementById("message");

function shortDateString(d) {
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear() % 100}`;
}

/**
 * An item in the aggregate feed.
 */
class FeedItem {
    /**
     * Creates a new FeedItem with the given properties.
     * 
     * @param {string} title 
     * @param {string} url 
     * @param {string} description 
     * @param {Date} pubDate 
     * @param {string} creator 
     * @param {string} channelTitle 
     */
    constructor(title, url, description, pubDate, creator, channelTitle) {
        this.title = title;
        this.url = url;
        this.description = description;
        this.pubDate = pubDate;
        this.creator = creator;
        this.channelTitle = channelTitle;
    }

    /**
     * Create a FeedItem that represents the given RSS channel item.
     * 
     * @param {Element} itemElement the element in the DOM document for the RSS
     * channel
     * @returns a FeedItem containing the same information, with the channelTitle
     * property set to null
     */
    static parseItem(itemElement) {
        let res = new FeedItem(null, null, null, null, null, null);
        for (const child of itemElement.children) {
            switch (child.tagName.toLowerCase()) {
                case "title":
                    res.title = child.textContent;
                    break;

                case "link":
                    res.url = child.textContent;
                    break;

                case "description":
                    res.description = child.textContent;
                    break;

                case "pubdate":
                    res.pubDate = new Date(child.textContent);
                    break;
                
                case "dc:creator":
                    res.creator = child.textContent;

                default:
                    break;
            }
        }
        return res;
    }

    /**
     * Creates a DOM element for this FeedItem, to be displayed in the sidebar.
     * @returns {Element} 
     */
    toHTMLElement () {
        let element = document.createElement("div");
        element.classList.add("feed-item");

        let pubDateElement = document.createElement("div");
        pubDateElement.classList.add("pubdate");
        pubDateElement.append(document.createTextNode(shortDateString(this.pubDate)));
        element.append(pubDateElement);

        let channelTitleElement = document.createElement("div");
        channelTitleElement.classList.add("channel-title");
        channelTitleElement.append(document.createTextNode(this.channelTitle));
        element.append(channelTitleElement);

        let titleElement = document.createElement("div");
        titleElement.classList.add("title");
        let linkElement = document.createElement("a");
        linkElement.setAttribute("href", this.url);
        linkElement.append(document.createTextNode(this.title));
        titleElement.append(linkElement);
        element.append(titleElement);

        let creatorElement = document.createElement("div");
        creatorElement.classList.add("creator");
        creatorElement.append(document.createTextNode(this.creator));
        element.append(creatorElement);


        let descriptionElement = document.createElement("div");
        descriptionElement.classList.add("description");
        descriptionElement.append(document.createTextNode(this.description));
        element.append(descriptionElement);

        return element;
    }
}

/**
 * Create an array of FeedItems given the text from a RSS channel.
 * 
 * @param {string} rawXML the raw XML from the RSS channel to parse.
 * @returns {FeedItem[]} an array of FeedItems created from the items in the
 * given RSS channel
 */
function parseRSS(rawXML) {
    let parsedXML = parser.parseFromString(rawXML, "text/xml");
    let channel = parsedXML.getElementsByTagName("channel")[0];

    let channelTitle;
    let channelItems = [];

    for (const child of channel.children) {
        switch (child.tagName) {
            case "title":
                channelTitle = child.textContent;
                break;
        
            case "item":
                var newChannelItem = FeedItem.parseItem(child);
                newChannelItem.channelTitle = channelTitle;
                channelItems.push(newChannelItem);

            default:
                break;
        }
    }

    return channelItems;
}

/**
 * Obtain a list of RSS channel items from the channel at the given URL.
 * 
 * @param {*} url 
 * @returns {FeedItem[]}
 */
async function fetchRSSFeedFromUrl(url) {
    let response;
    try {
        response = await fetch(url);
        console.log("Success!");
    } catch (e) {
        console.log(url + ": Potential CORS issue");
        console.error(e);
        return [];
    }
    let rawXML = await response.text();
    console.log(rawXML);
    return parseRSS(rawXML);
}

async function createFeed() {
    let feedDiv = document.getElementById("feed");
    let channelList = await getChannelList();
    // is Promise.all really necessary here?
    let feedPromises = []
    for (const channel of channelList) {
        feedPromises.push(fetchRSSFeedFromUrl(channel.url));
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