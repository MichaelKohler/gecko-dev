/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 /* eslint-env browser */

"use strict";

const { createClass, createFactory, PropTypes, DOM: dom } =
  require("devtools/client/shared/vendor/react");
const { connect } = require("devtools/client/shared/vendor/react-redux");

const {
  updateDeviceDisplayed,
  updateDeviceModalOpen,
  updatePreferredDevices,
} = require("./actions/devices");
const { changeNetworkThrottling } = require("./actions/network-throttling");
const { takeScreenshot } = require("./actions/screenshot");
const { updateTouchSimulationEnabled } = require("./actions/touch-simulation");
const {
  changeDevice,
  resizeViewport,
  rotateViewport
} = require("./actions/viewports");
const DeviceModal = createFactory(require("./components/device-modal"));
const GlobalToolbar = createFactory(require("./components/global-toolbar"));
const Viewports = createFactory(require("./components/viewports"));
const Types = require("./types");

let App = createClass({
  displayName: "App",

  propTypes: {
    devices: PropTypes.shape(Types.devices).isRequired,
    location: Types.location.isRequired,
    networkThrottling: PropTypes.shape(Types.networkThrottling).isRequired,
    screenshot: PropTypes.shape(Types.screenshot).isRequired,
    touchSimulation: PropTypes.shape(Types.touchSimulation).isRequired,
    viewports: PropTypes.arrayOf(PropTypes.shape(Types.viewport)).isRequired,
  },

  onBrowserMounted() {
    window.postMessage({ type: "browser-mounted" }, "*");
  },

  onChangeNetworkThrottling(enabled, profile) {
    window.postMessage({
      type: "change-network-throtting",
      enabled,
      profile,
    }, "*");
    this.props.dispatch(changeNetworkThrottling(enabled, profile));
  },

  onChangeViewportDevice(id, device) {
    window.postMessage({
      type: "change-viewport-device",
      device,
    }, "*");
    this.props.dispatch(changeDevice(id, device.name));
    this.props.dispatch(updateTouchSimulationEnabled(device.touch));
  },

  onContentResize({ width, height }) {
    window.postMessage({
      type: "content-resize",
      width,
      height,
    }, "*");
  },

  onDeviceListUpdate(devices) {
    updatePreferredDevices(devices);
  },

  onExit() {
    window.postMessage({ type: "exit" }, "*");
  },

  onResizeViewport(id, width, height) {
    this.props.dispatch(resizeViewport(id, width, height));
  },

  onRotateViewport(id) {
    this.props.dispatch(rotateViewport(id));
  },

  onScreenshot() {
    this.props.dispatch(takeScreenshot());
  },

  onUpdateDeviceDisplayed(device, deviceType, displayed) {
    this.props.dispatch(updateDeviceDisplayed(device, deviceType, displayed));
  },

  onUpdateDeviceModalOpen(isOpen) {
    this.props.dispatch(updateDeviceModalOpen(isOpen));
  },

  onUpdateTouchSimulation(isEnabled) {
    window.postMessage({
      type: "update-touch-simulation",
      enabled: isEnabled,
    }, "*");

    this.props.dispatch(updateTouchSimulationEnabled(isEnabled));
  },

  render() {
    let {
      devices,
      location,
      networkThrottling,
      screenshot,
      touchSimulation,
      viewports,
    } = this.props;

    let {
      onBrowserMounted,
      onChangeNetworkThrottling,
      onChangeViewportDevice,
      onContentResize,
      onDeviceListUpdate,
      onExit,
      onResizeViewport,
      onRotateViewport,
      onScreenshot,
      onUpdateDeviceDisplayed,
      onUpdateDeviceModalOpen,
      onUpdateTouchSimulation,
    } = this;

    return dom.div(
      {
        id: "app",
      },
      GlobalToolbar({
        networkThrottling,
        screenshot,
        touchSimulation,
        onChangeNetworkThrottling,
        onExit,
        onScreenshot,
        onUpdateTouchSimulation,
      }),
      Viewports({
        devices,
        location,
        screenshot,
        viewports,
        onBrowserMounted,
        onChangeViewportDevice,
        onContentResize,
        onRotateViewport,
        onResizeViewport,
        onUpdateDeviceModalOpen,
      }),
      DeviceModal({
        devices,
        onDeviceListUpdate,
        onUpdateDeviceDisplayed,
        onUpdateDeviceModalOpen,
      })
    );
  },

});

module.exports = connect(state => state)(App);
