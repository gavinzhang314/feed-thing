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