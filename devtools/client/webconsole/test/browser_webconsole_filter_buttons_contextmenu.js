/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80: */
/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests that the filter button context menu logic works correctly.

"use strict";

const TEST_URI = "http://example.com/";

function test() {
  loadTab(TEST_URI).then(() => {
    openConsole().then(testFilterButtons);
  });
}

function testFilterButtons(hud) {
  let hudBox = hud.ui.rootElement;

  testRightClick("net", hudBox, hud)
    .then(() => testRightClick("css", hudBox, hud))
    .then(() => testRightClick("js", hudBox, hud))
    .then(() => testRightClick("logging", hudBox, hud))
    .then(() => testRightClick("security", hudBox, hud))
    .then(finishTest);
}

function testRightClick(category, hudBox, hud) {
  let deferred = promise.defer();
  let selector = ".webconsole-filter-button[category=\"" + category + "\"]";
  let button = hudBox.querySelector(selector);
  let mainButton = getMainButton(button, hud);
  let origCheckedState = button.getAttribute("aria-pressed");
  let contextMenuId = category + "-contextmenu";
  let contextMenu = hud.iframeWindow.document.getElementById(contextMenuId);

  function verifyContextMenuIsClosed() {
    info("verify the context menu is closed");
    is(button.getAttribute("open"), false, "The context menu for the \"" +
       category + "\" button is closed");
  }

  function verifyOriginalCheckedState() {
    info("verify the button has the original checked state");
    is(button.getAttribute("aria-pressed"), origCheckedState,
       "The button state should not have changed");
  }

  function verifyNewCheckedState() {
    info("verify the button's checked state has changed");
    isnot(button.getAttribute("aria-pressed"), origCheckedState,
          "The button state should have changed");
  }

  function leftClickToClose() {
    info("left click the button to close the contextMenu");
    EventUtils.sendMouseEvent({type: "click"}, button);
    executeSoon(() => {
      verifyContextMenuIsClosed();
      verifyOriginalCheckedState();
      leftClickToChangeCheckedState();
    });
  }

  function leftClickToChangeCheckedState() {
    info("left click the mainbutton to change checked state");
    EventUtils.sendMouseEvent({type: "click"}, mainButton);
    executeSoon(() => {
      verifyContextMenuIsClosed();
      verifyNewCheckedState();
      deferred.resolve();
    });
  }

  verifyContextMenuIsClosed();
  info("right click the button to open the context menu");
  waitForContextMenu(contextMenu, mainButton, verifyOriginalCheckedState,
                     leftClickToClose);
  return deferred.promise;
}

function getMainButton(targetButton, hud) {
  let anonymousNodes = hud.ui.document.getAnonymousNodes(targetButton);
  let subbutton;

  for (let i = 0; i < anonymousNodes.length; i++) {
    let node = anonymousNodes[i];
    if (node.classList.contains("toolbarbutton-menubutton-button")) {
      subbutton = node;
      break;
    }
  }

  return subbutton;
}
