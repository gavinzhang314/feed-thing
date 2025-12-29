"use strict";

import { queryChannel, setChannel } from "../lib.js";
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
 * Return the source of the webpage that is currently active in the current window.
 * N.B. this is done by fetching the URL of this webpage, meaning that any changes
 * in the source of the webpage after loading, e.g. from JavaScript, will not be
 * reflected by the return value. For our purposes, this shouldn't matter, since
 * the link tags of almost all webpages will not be changed after loading the webpage.
 * I think it is safe to assume so, at least.
 * 
 * @return {Promise<string>} a Promise resolving to the source of current webpage
 */
async function getCurrWebpageSource() {
    let currTab = await browser.tabs.query({active: true, currentWindow: true});

    console.assert(currTab.length === 1, currTab);
    if (currTab[0].url.indexOf("http") !== 0) {
        return "";
    } else {
        let response = await fetch(currTab[0].url);
        return await response.text();
    }
}

/**
 * Clear all entries from table.
 */
function clearTable() {
    for (const child of table.children)
        table.removeChild(child);
}

/**
 * Create a table row corresponding to the RSS channel at the provided URL.
 * 
 * @param {string} url the URL of the RSS channel to create the table row for
 * @return {Promise<Element>} a Promise resolving to a DOM element containing the table row
 */
async function channelUrlToTableRow(url) {
    let response = await fetch(url);
    let text = await response.text();
    
    let channelDOM = parser.parseFromString(text, "text/xml");
    let channelElement = channelDOM.getElementsByTagName("channel")[0];
    let titleTag = Array.from(channelElement.children).find(c => c.tagName === "title");
    let title = titleTag.textContent;

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
        addButton.setAttribute("title", "Subscribe to this RSS feed");
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
    
    let text = await getCurrWebpageSource();
    
    let currPageDOM = parser.parseFromString(text, "text/html");
    let links = currPageDOM.getElementsByTagName("link");
    let channelUrls = [];
    
    for (const link of links) {
        if (link.hasAttribute("type") 
            && link.getAttribute("type") === "application/rss+xml")
            channelUrls.push(link.getAttribute("href"));
    }
    
    if (channelUrls.length == 0) {
        document.getElementById("message").textContent = "No RSS feeds found.";
    } else {
        document.getElementById("message").setAttribute("hidden", "");
    }
    
    for (let i = 0; i < channelUrls.length; i++) {
        table.append(await channelUrlToTableRow(channelUrls[i]));
    }
}

createTable().catch(e => console.error);