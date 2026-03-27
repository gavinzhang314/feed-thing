/**
 * A RSS channel that the user has subscribed to, as stored in storage.local.
 * @typedef {Object} Channel
 * @property {string} url the URL that the channel is at
 * @property {string} title the name given to the channel, as displayed to the user
 */

/**
 * Check if storage.local has been initialized yet and initialize it if
 * it has not.
 */
export async function initializeLocalStorage() {
    let keys = await browser.storage.local.getKeys()
    if (!keys.includes("version"))
        browser.storage.local.set({
            "channels": [],
            "version": browser.runtime.getManifest()["version"]
        });
}

/**
 * Fetch the given url with an additional (non-standard) "Remove-Origin"
 * header field set to "true", so that the background script intercepts
 * it and removes the "Origin" field.
 * 
 * @param {string} url The URL to fetch from
 * @returns {Promise<Response>} a Promise resolving to the response from fetch
 */
export function fetchWithoutOrigin(url) {
    let request = new Request(url);
    request.headers.append("Remove-Origin", "true");
    return fetch(request);
}

/**
 * Return a Promise wich resolves to the list of channels stored in storage.local.
 * 
 * @returns {Promise<Channel[]>}
 */
export async function getChannelList() {
    return (await browser.storage.local.get("channels"))["channels"];
}

/**
 * Set the list of channels in storage.local to the specified array.
 * 
 * @param {Channel[]} channels list of Objects representing channels
 * @returns {Promise} a Promise resolving to nothing if storage.local.set() succeeds
 */
export function setChannelList(channels) {
    return browser.storage.local.set({"channels": channels});
}

/**
 * Add the channel with the given data to the list of channels in storage.local.
 * If there is already a channel with the given URL, update it to match.
 * 
 * @param {Channel} channel the channel to set
 * @returns {Promise} a Promise resolving to nothing if storage.local.set() succeeds
 */
export async function setChannel(channel) {
    let channels = await getChannelList();
    let i = channels.findIndex(c => c.url === channel.url);
    if (i == -1) {
        channels.push(channel);
    } else {
        channels[i] = channel;
    }
    return await setChannelList(channels);
}

/**
 * Find all channels stored in storage.local with key/value pairs that match
 * the key/value pairs in the provided object.
 * 
 * @param {Object} o an object containing the key/value pairs to search for
 * @returns {Promise<Channel[]>} a Promise resolving to an array of all objects 
 * representating channels which have the given key/value pairs
 */
export async function queryChannel(o) {
    let channels = await getChannelList();
    let keys = Object.keys(o);
    let matches = [];
    for (const channel of channels) {
        let isMatch = true;
        for (const key of keys) {
            if (channel[key] !== o[key])
                isMatch = false;
        }
        if (isMatch)
            matches.push(channel);
    }
    return matches;
}

/**
 * Remove and return all channels stored in storage.local with key/value pairs
 * that match the key/value pairs in the provided object.
 * 
 * @param {Object} o an object containing the key/value pairs to search for
 * @returns {Promise<Channel[]>} a Promise resolving to an array of all Channels 
 * in storage.local which have the given key/value pairs and have therefore been 
 * removed
 */
export async function removeChannel(o) {
    let channels = await getChannelList();
    let keys = Object.keys(o);
    let matches = [];
    let remaining = [];
    for (const channel of channels) {
        let isMatch = true;
        for (const key of keys) {
            if (channel[key] !== o[key])
                isMatch = false;
        }
        if (isMatch) {
            matches.push(channel);
        } else {
            remaining.push(channel);
        }
    }
    await setChannelList(remaining);
    return matches;
}

function shortDateString(d) {
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear() % 100}`;
}

/**
 * An item in the aggregate feed.
 */
export class FeedItem {
    /**
     * Create a new FeedItem with all properties set to null.
     */
    constructor() {
        this.title = null;
        this.url = null;
        this.description = "";
        this.pubDate = null;
        this.creator = null;
        this.channelTitle = null;
    }

    /**
     * Create a FeedItem that represents the given RSS channel item.
     * 
     * @param {Element} itemElement the element in the DOM document for the RSS
     * channel
     * @returns a FeedItem containing the same information, with the channelTitle
     * property set to null
     */
    static parseRSSItem(itemElement) {
        let res = new FeedItem();
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
     * Create a FeedItem that represents the given Atom channel item.
     * 
     * @param {Element} itemElement the element in the DOM document for the RSS
     * channel
     * @returns a FeedItem containing the same information, with the channelTitle
     * property set to null
     */
    static parseAtomItem(itemElement) {
        let res = new FeedItem();
        for (const child of itemElement.children) {
            switch (child.tagName.toLowerCase()) {
                case "title":
                    res.title = child.textContent;
                    break;

                case "link":
                    res.url = child.getAttribute("href");
                    break;

                case "summary":
                    res.description = child.textContent;
                    break;

                case "published":
                    res.pubDate = new Date(child.textContent);
                    break;
                
                case "author":
                    let authorNameItemTags = child.getElementsByTagName("name");
                    if (authorNameItemTags.length > 0)
                        res.creator = authorNameItemTags[0].textContent;
                    break;

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

export class Channel {
    /**
     * Create a new Channel with null title and no items.
     */
    constructor() {
        this.title = null;
        this.channelType = null;
        this.items = [];
    }

    /**
     * Fetch and parse the feed at the given URL.
     * 
     * @param {*} url 
     * @returns {Promise<Channel>}
     */

    static async getFeedFromUrl(url) {
        let channel = new Channel();
        const parser = new DOMParser();

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

        let parsedXML = parser.parseFromString(rawXML, "text/xml");
        console.log(parsedXML.documentElement.tagName);

        if (parsedXML.documentElement.tagName == "feed") {
            channel.channelType = "atom";
            let feedElement = parsedXML.documentElement;

            for (const child of feedElement.children) {
                console.log(child.tagName);
                switch (child.tagName) {
                    case "title":
                        channel.title = child.textContent;
                        break;
                
                    case "entry":
                        let newItem = FeedItem.parseAtomItem(child);
                        newItem.channelTitle = channel.title;
                        channel.items.push(newItem);

                    default:
                        break;
                }
            }
            return channel;
        } else {
            channel.channelType = "rss";
            let channelItem = parsedXML.getElementsByTagName("channel")[0];
            for (const child of channelItem.children) {
                switch (child.tagName) {
                    case "title":
                        channel.title = child.textContent;
                        break;
                
                    case "item":
                        var newItem = FeedItem.parseRSSItem(child);
                        newItem.channelTitle = channel.title;
                        channel.items.push(newItem);

                    default:
                        break;
                }
            }
            return channel;
        }
    }
}