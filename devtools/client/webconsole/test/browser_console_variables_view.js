/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80: */
/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Check that variables view works as expected in the web console.

"use strict";

const TEST_URI = "http://example.com/browser/devtools/client/webconsole/" +
                 "test/test-eval-in-stackframe.html";

var hud, gVariablesView;

registerCleanupFunction(function () {
  hud = gVariablesView = null;
});

add_task(function* () {
  yield loadTab(TEST_URI);

  hud = yield openConsole();

  let msg = yield hud.jsterm.execute("(function foo(){})");

  ok(msg, "output message found");
  ok(msg.textContent.includes("function foo()"),
                              "message text check");

  executeSoon(() => {
    EventUtils.synthesizeMouse(msg.querySelector("a"), 2, 2, {},
      hud.iframeWindow);
  });

  let varView = yield hud.jsterm.once("variablesview-fetched");
  ok(varView, "object inspector opened on click");

  yield findVariableViewProperties(varView, [{
    name: "name",
    value: "foo",
  }], { webconsole: hud });
});

add_task(function* () {
  let msg = yield hud.jsterm.execute("fooObj");

  ok(msg, "output message found");
  ok(msg.textContent.includes('{ testProp: "testValue" }'),
                              "message text check");

  let anchor = msg.querySelector("a");
  ok(anchor, "object link found");

  let fetched = hud.jsterm.once("variablesview-fetched");

  // executeSoon
  EventUtils.synthesizeMouse(anchor, 2, 2, {}, hud.iframeWindow);

  let view = yield fetched;

  let results = yield onFooObjFetch(view);

  let vView = yield onTestPropFound(results);
  let results2 = yield onFooObjFetchAfterUpdate(vView);

  let vView2 = yield onUpdatedTestPropFound(results2);
  let results3 = yield onFooObjFetchAfterPropRename(vView2);

  let vView3 = yield onRenamedTestPropFound(results3);
  let results4 = yield onPropUpdateError(vView3);

  yield onRenamedTestPropFoundAgain(results4);

  let prop = results4[0].matchedProp;
  yield testPropDelete(prop);
});

function onFooObjFetch(variable) {
  gVariablesView = variable._variablesView;
  ok(gVariablesView, "variables view object");

  return findVariableViewProperties(variable, [
    { name: "testProp", value: "testValue" },
  ], { webconsole: hud });
}

function onTestPropFound(results) {
  let prop = results[0].matchedProp;
  ok(prop, "matched the |testProp| property in the variables view");

  is("testValue", results[0].value,
     "|fooObj.testProp| value is correct");

  // Check that property value updates work and that jsterm functions can be
  // used.
  return updateVariablesViewProperty({
    property: prop,
    field: "value",
    string: "document.title + window.location + $('p')",
    webconsole: hud
  });
}

function* onFooObjFetchAfterUpdate(variable) {
  info("onFooObjFetchAfterUpdate");
  let expectedValue = yield ContentTask.spawn(gBrowser.selectedBrowser, null,
    function* () {
      return content.document.title + content.location +
        "[object HTMLParagraphElement]";
    });

  return findVariableViewProperties(variable, [
    { name: "testProp", value: expectedValue },
  ], { webconsole: hud });
}

function* onUpdatedTestPropFound(results) {
  let prop = results[0].matchedProp;
  ok(prop, "matched the updated |testProp| property value");

  ContentTask.spawn(gBrowser.selectedBrowser, results[0].value,
     function* (expectedValue) {
       is(content.wrappedJSObject.fooObj.testProp, expectedValue,
          "|fooObj.testProp| value has been updated");
     });

  // Check that property name updates work.
  return updateVariablesViewProperty({
    property: prop,
    field: "name",
    string: "testUpdatedProp",
    webconsole: hud
  });
}

function* onFooObjFetchAfterPropRename(variable) {
  info("onFooObjFetchAfterPropRename");

  let expectedValue = yield ContentTask.spawn(gBrowser.selectedBrowser, {},
    function* () {
      let para = content.wrappedJSObject.document.querySelector("p");
      return content.document.title + content.location + para;
    });

  // Check that the new value is in the variables view.
  return findVariableViewProperties(variable, [
    { name: "testUpdatedProp", value: expectedValue },
  ], { webconsole: hud });
}

function onRenamedTestPropFound(results) {
  let prop = results[0].matchedProp;
  ok(prop, "matched the renamed |testProp| property");

  ContentTask.spawn(gBrowser.selectedBrowser, results[0].value,
     function* (expectedValue) {
       ok(!content.wrappedJSObject.fooObj.testProp,
          "|fooObj.testProp| has been deleted");
       is(content.wrappedJSObject.fooObj.testUpdatedProp, expectedValue,
          "|fooObj.testUpdatedProp| is correct");
     });

  // Check that property value updates that cause exceptions are reported in
  // the web console output.
  return updateVariablesViewProperty({
    property: prop,
    field: "value",
    string: "foobarzFailure()",
    webconsole: hud
  });
}

function* onPropUpdateError(variable) {
  info("onPropUpdateError");

  let expectedValue = yield ContentTask.spawn(gBrowser.selectedBrowser, {},
    function* () {
      let para = content.wrappedJSObject.document.querySelector("p");
      return content.document.title + content.location + para;
    });

  // Make sure the property did not change.
  return findVariableViewProperties(variable, [
    { name: "testUpdatedProp", value: expectedValue },
  ], { webconsole: hud });
}

function onRenamedTestPropFoundAgain(results) {
  let prop = results[0].matchedProp;
  ok(prop, "matched the renamed |testProp| property again");

  return waitForMessages({
    webconsole: hud,
    messages: [{
      name: "exception in property update reported in the web console output",
      text: "foobarzFailure",
      category: CATEGORY_OUTPUT,
      severity: SEVERITY_ERROR,
    }],
  });
}

function* testPropDelete(prop) {
  gVariablesView.window.focus();
  prop.focus();

  yield executeSoon(() => {
    EventUtils.synthesizeKey("VK_DELETE", {}, gVariablesView.window);
  });

  // TODO: this might cause intermittents, is there anything else we could do
  // here to wait until the property is deleted without having to write a
  // waitForXXXX function which takes a promise for the validator?
  yield DevToolsUtils.waitForTime(500);

  yield ContentTask.spawn(gBrowser.selectedBrowser, null, function* () {
    ok(!("testUpdatedProp" in content.wrappedJSObject.fooObj), "bla");
  });
}
