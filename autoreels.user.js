// ==UserScript==
// @name         PRSEK's Degen Reel Autoscroller
// @namespace    http://tampermonkey.net/
// @version      2026-08-04
// @description  detects when reels are finished and auto scrolls to next video
// @author       Stropheum
// @match        https://www.instagram.com/reels/*
// @match        https://www.instagram.com/reel/*
// @match        https://www.instagram.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      localhost
// ==/UserScript==

(function () {
    'use strict';

    let currentVideo = null;
    let hasAdvanced = false;
    let loggingEnabled = GM_getValue("enabled", false);

    GM_registerMenuCommand(
        `${loggingEnabled ? "✅" : "❌"} loggingEnabled`,
        () => {
            GM_setValue("enabled", !enabled);
            alert("Reload the page to see the updated menu.");
        }
    );

    function getCurrentVideo() {
        return [...document.querySelectorAll("video")]
            .find(v => !v.paused && v.currentTime > 0);
    }


    function findScrollContainer(element) {
        let parent = element.parentElement;

        while (parent) {
            const style = getComputedStyle(parent);

            if (
                (style.overflowY === "auto" ||
                 style.overflowY === "scroll") &&
                parent.scrollHeight > parent.clientHeight
            ) {
                return parent;
            }

            parent = parent.parentElement;
        }

        return document.scrollingElement;
    }


    function nextReel() {
        console.log("NEXT REEL CALLED");

        const video = getCurrentVideo();

        if (!video) {
            if (loggingEnabled) {
                console.log("No active video found");
            }
            return;
        }

        const container = findScrollContainer(video);

        if (loggingEnabled) {
            console.log("Scrolling container:", container);
        }

        if (container) {
            container.scrollBy({
                top: container.clientHeight,
                behavior: "smooth"
            });
        }
    }


    function attach(video) {
        if (video === currentVideo) {
            return;
        }

        if (loggingEnabled) {
            console.log("Attaching to video", video);
        }

        currentVideo = video;
        hasAdvanced = false;


        video.addEventListener("timeupdate", () => {

            if (hasAdvanced) {
                return;
            }


            if (!isFinite(video.duration) || video.duration <= 0) {
                return;
            }


            const remaining =
                video.duration - video.currentTime;


            if (remaining <= 0.25) {

                if (loggingEnabled) {
                    console.log("Video finished");
                }

                hasAdvanced = true;

                setTimeout(nextReel, 300);
            }
        });
    }


    function checkVideo() {
        const video = getCurrentVideo();

        if (video) {
            attach(video);
        }
    }


    function setupExternalControls() {

        if (loggingEnabled) {
            console.log("Starting external controller polling");
        }


        setInterval(() => {

            GM_xmlhttpRequest({

                method: "GET",

                url: "http://localhost:8765/poll",


                onload: (response) => {

                    if (response.responseText === "nextReel") {

                        if (loggingEnabled) {
                            console.log(
                                "External command received"
                            );
                        }

                        nextReel();
                    }
                },


                onerror: () => {
                }

            });


        }, 100);
    }


    const observer = new MutationObserver(() => {
        checkVideo();
    });


    observer.observe(document.body, {
        childList: true,
        subtree: true
    });


    setInterval(checkVideo, 1000);


    setupExternalControls();


    if (loggingEnabled) {
        console.log("PRSEK Reel Autoscroller loaded");
    }

})();
