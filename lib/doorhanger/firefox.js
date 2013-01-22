/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

module.metadata = {
  "stability": "experimental",
};

const { getMostRecentBrowserWindow } = require("sdk/window/utils");

const { merge } = require("sdk/util/object");
const { Class, obscure } = require("sdk/core/heritage");
const { ns } = require("sdk/core/namespace");
const { id: addonId } = require("sdk/self");

const notifications = ns();

let notificationCount = 0;

const Notification = Class(obscure({
  initialize: function initialize(options) {
    options = merge({
      secondaryActions: [],
    }, options, {
      id: addonId + "-notification-" + (++notificationCount)
    });

    let type = null;

    if (options.type === "geolocation")
      type = options.id = options.type;

    Object.defineProperty(this, "type", {
      value: type
    });

    notifications(this).options = options;

    let { mainAction, secondaryActions } = options;

    options.mainAction = merge({}, mainAction);
    options.secondaryActions = secondaryActions.slice(0);

    bindAction(options.mainAction, this);

    options.secondaryActions = options.secondaryActions.map(function (action){
      action = merge({}, action);
      bindAction(action, this);

      return action;
    }, this);

    // At least on OS X, `timeout` option doesn't work. It should be set to
    // `Date.now() + timeout` but nothing happens, so here a workaround.
    if (options.timeout) {
      const { setTimeout } = require("api-utils/timer");

      setTimeout(function (notification) {
        notification.remove();
      }, options.timeout, this);
    }
  },

  remove: function remove() {
    notifications(this).object.remove();
  },

  toString: function toString() {
    return "[object Doorhanger Notification]"
  }
}));

function bindAction(action, notification) {
  if (action && typeof action.callback === "function") {
    let { callback } = action;
    let { options } = notifications(notification);

    action.callback = callback.bind(notification);
  }
}

function notify (options) {
  let { PopupNotifications } = getMostRecentBrowserWindow();
  let notification = Notification(options);

  let popupOptions = {
    persistence: -1,
    persistWhileVisible: true
  };

  if (options.iconURL)
    popupOptions.popupIconURL = options.iconURL;

  let { id, text, mainAction, secondaryActions } = notifications(notification).options;

  notifications(notification).object  = PopupNotifications.show(
    getMostRecentBrowserWindow().gBrowser.selectedBrowser,
    id,
    text,
    null,
    mainAction,
    secondaryActions,
    popupOptions
  );

  return notification;
}

exports.notify = notify;
