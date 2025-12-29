"use strict";

/**
 * @typedef {import(../lib.js).Channel} Channel
 */
import { getChannelList, setChannel, removeChannel } from "../lib.js";

let tbody = document.querySelector("tbody");
let messageDiv = document.getElementById("message");

let RSSLink = document.createElement("a");
RSSLink.setAttribute("target", "_blank");
let newTabIcon = document.createElement("img");
newTabIcon.setAttribute("src", "/icons/open-new-window.svg");
newTabIcon.classList.add("icon");
RSSLink.append(newTabIcon);

/**
 * Remove all children from the given element.
 * @param {Element} e
 */
function clearElement(e) {
    e.innerHTML = "";
    /*
    for (const child of e.children)
        e.removeChild(child);
    */
}

/**
 * Create a table row corresponding to the RSS channel at the provided URL.
 * 
 * @param {Channel} channel the channel to create the table row for
 * @return {Element} a DOM element containing the table row
 */
function channelToTableRow(channel) {
    let tableRow = document.createElement("tr");

    let tdFeed = document.createElement("td");
    tdFeed.classList.add("td-feed");
    tdFeed.append(document.createTextNode(channel.title));
    tableRow.append(tdFeed);

    let tdButtons = document.createElement("td");
    tdButtons.classList.add("td-buttons");
    
    let renameButton = document.createElement("button");
    renameButton.setAttribute("type", "button");
    renameButton.append(document.createTextNode("Rename"));
    renameButton.addEventListener("click", e => {
        tdFeed.removeChild(tdFeed.firstChild);
        tdButtons.removeChild(renameButton);
        let titleInput = document.createElement("input");
        titleInput.setAttribute("value", channel.title);
        tdFeed.append(titleInput);
        let confirmButton = document.createElement("button");
        confirmButton.append(document.createTextNode("Confirm"));

        let confirmListener = async function (f) {
            await setChannel(Object.assign(channel, {"title": titleInput.value}));
            clearElement(tbody);
            createTable();
            removeEventListener("keydown", keyListener);
        }
        let keyListener = function (f) {
            if (f.code === "Enter") {
                confirmListener();
            } else if (f.code === "Escape") {
                clearElement(tbody);
                createTable();
                removeEventListener("keydown", keyListener);
            }
        }

        confirmButton.addEventListener("click", confirmListener);
        addEventListener("keydown", keyListener);
        tdButtons.prepend(confirmButton);
    });
    tdButtons.append(renameButton);

    let deleteButton = document.createElement("button");
    deleteButton.setAttribute("type", "button");
    deleteButton.setAttribute("title", "Delete feed");
    let trashIcon = document.createElement("img");
    trashIcon.setAttribute("src", "/icons/trash.svg");
    trashIcon.classList.add("icon");
    deleteButton.append(trashIcon);
    deleteButton.addEventListener("click", e => {
        tdButtons.removeChild(deleteButton);
        messageDiv.append(document.createTextNode("Delete " + channel.title + "?"));
        let yesButton = document.createElement("button");
        yesButton.append(document.createTextNode("Yes"));
        let noButton = document.createElement("button");
        noButton.append(document.createTextNode("No"));

        let yesListener = async function(f) {
            await removeChannel(channel);
            clearElement(tbody);
            clearElement(messageDiv);
            messageDiv.setAttribute("hidden", "");
            createTable();
            removeEventListener("keydown", keyListener);
        }
        let noListener = function(f) {
            clearElement(tbody);
            clearElement(messageDiv);
            messageDiv.setAttribute("hidden", "");
            createTable();
            removeEventListener("keydown", keyListener);
        }
        let keyListener = function(f) {
            if (f.code === "Enter") {
                yesListener();
            } else if (f.code === "Escape") {
                noListener();
            }
        }

        yesButton.addEventListener("click", yesListener);
        noButton.addEventListener("click", noListener);
        addEventListener("keydown", keyListener);

        messageDiv.append(yesButton);
        messageDiv.append(noButton);
        messageDiv.removeAttribute("hidden");
    });
    tdButtons.append(deleteButton);

    tableRow.append(tdButtons);

    let tdLink = document.createElement("td");
    tdLink.classList.add("td-link");
    let feedLink = RSSLink.cloneNode(true);
    feedLink.setAttribute("href", channel.url);
    tdLink.append(feedLink);
    tableRow.append(tdLink);
    
    return tableRow;
}

async function createTable() {
    let channels = await getChannelList();
    channels.sort((a, b) => a.title.localeCompare(b.title));
    if (channels.length === 0) {
        messageDiv.removeAttribute("hidden");
        messageDiv.append(document.createTextNode("You are not subscribed to any RSS feeds."));
    }

    for (let i = 0; i < channels.length; i++) {
        let newRow = channelToTableRow(channels[i]);
        if (i % 2 === 0) {
            newRow.classList.add("dark-bg");
        }
        tbody.append(newRow);
    }
}

createTable().catch(console.error);