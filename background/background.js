"use strict";

import { initializeLocalStorage } from "../lib.js"

initializeLocalStorage();

// Remove the Origin header field from any request sent by this extension.
// Taken from https://stackoverflow.com/questions/47356375/firefox-fetch-api-how-to-omit-the-origin-header-in-the-request
// with modifications (mainly to refine it by only removing the Origin header field
// from only requests sent by this extension instead of those sent by all extensions).
const manifestUrl = browser.runtime.getURL("/");
function removeOrigin(details) {
    let headers = details.requestHeaders;
    if (headers.some(h => h.name.toLowerCase() === "origin"
                    && h.value.toLowerCase().indexOf(manifestUrl) === 0)) {
        return {
            requestHeaders: headers.filter(h => h.name.toLowerCase() !== "origin")
        };
    } else {
        return {};
    }
}
browser.webRequest.onBeforeSendHeaders.addListener(
    removeOrigin,
    {"urls": ["<all_urls>"]},
    ["blocking", "requestHeaders"]);