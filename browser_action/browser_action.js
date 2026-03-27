"use strict";

import { Channel, queryChannel, setChannel } from "../lib.js";
const parser = new DOMParser();

let table = document.querySelector("table");

let RSSLink = document.createElement("a");
let newTabIcon = document.createElement("img");
newTabIcon.setAttribute("src", "/icons/open-new-window.svg");
newTabIcon.classList.add("icon");
RSSLink.append(newTabIcon);

document.getElementById("manage-subscriptions").addEventListener("click", e => {
    browser.tabs.create({
        url: "/pages/manage_subscriptions.html"
    });
})

/**
 * Clear all entries from table.
 */
function clearTable() {
    for (const child of table.children)
        table.removeChild(child);
}

// TODO: Move to Channel class?
/**
 * Create a table row corresponding to the RSS channel at the provided URL.
 * 
 * @param {string} url the URL of the RSS channel to create the table row for
 * @return {Promise<Element>} a Promise resolving to a DOM element containing the table row
 */
async function channelUrlToTableRow(url) {
    console.log(url);

    let title = (await Channel.getFeedFromUrl(url)).title;

    let tableRow = document.createElement("tr");

    let tdFeed = document.createElement("td");
    tdFeed.classList.add("td-feed");
    tableRow.append(tdFeed);

    let tdButtons = document.createElement("td");
    tdButtons.classList.add("td-buttons");
    let matches = await queryChannel({"url": url});
    if (matches.length === 0) {
        tdFeed.append(document.createTextNode(title));
        let addButton = document.createElement("button");
        addButton.setAttribute("type", "button");
        addButton.setAttribute("title", "Subscribe to this feed");
        addButton.append(document.createTextNode("+"));
        addButton.addEventListener("click", e => {
            tdFeed.removeChild(tdFeed.firstChild);
            tdButtons.removeChild(addButton);
            let titleInput = document.createElement("input");
            titleInput.setAttribute("value", title);
            tdFeed.append(titleInput);
            let confirmButton = document.createElement("button");
            confirmButton.append(document.createTextNode("\u2713"));

            let addChannelListener = function (f) {
                setChannel({"url": url, "title": titleInput.value});
                clearTable();
                createTable();
                removeEventListener("keydown", addChannelKeyListener);
            }
            let addChannelKeyListener = function (f) {
                if (f.code === "Enter")
                    addChannelListener();
            }
            confirmButton.addEventListener("click", addChannelListener);
            addEventListener("keydown", addChannelKeyListener);
            tdButtons.append(confirmButton);
        });
        tdButtons.append(addButton);
    } else {
        tdFeed.append(document.createTextNode(matches[0].title));
        tdFeed.classList.add("already-subscribed");
        tdFeed.setAttribute("title", "You are already subscribed to this feed.");
    }
    tableRow.append(tdButtons);

    let tdLink = document.createElement("td");
    tdLink.classList.add("td-link");
    let feedLink = RSSLink.cloneNode(true);
    feedLink.setAttribute("href", url);
    tdLink.append(feedLink);
    tableRow.append(tdLink);
    
    return tableRow;
}

/**
 * Create the table of RSS channels detected on the current webpage, which is
 * displayed in the browser action popup.
 */
async function createTable() {
    let text = "";
    let currTab = (await browser.tabs.query({active: true, currentWindow: true}))[0];
    let currUrl = currTab.url;

    // TODO: optimize by skipping steps if text remains empty
    if (currUrl.indexOf("http") == 0) {
        // Hopefully <link>s to RSS feeds don't get while the browser loads the website.
        // I think that that is a reasonable assumption to make.
        let response = await fetch(currUrl);
        text = await response.text();
    }
    
    let currPageDOM = parser.parseFromString(text, "text/html");
    let links = currPageDOM.getElementsByTagName("link");
    let channelUrls = [];
    
    for (const link of links) {
        if (link.hasAttribute("type") 
            && link.getAttribute("type") === "application/rss+xml")
            channelUrls.push(link.getAttribute("href"));
    }
    
    if (channelUrls.length == 0) {
        document.getElementById("message").textContent = "No feeds found.";
    } else {
        document.getElementById("message").setAttribute("hidden", "");
    }
    
    for (let i = 0; i < channelUrls.length; i++) {
        table.append(await channelUrlToTableRow(channelUrls[i]));
    }
}

createTable().catch(e => console.error);