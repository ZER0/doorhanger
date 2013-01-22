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
  },

  get type() null,

  remove: function remove() {
    let { options, object } = notifications(this);
    let { NativeWindow, tabId } = object;
    let { id } = options;

    NativeWindow.doorhanger.hide(id, tabId);
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
  let { NativeWindow, BrowserApp } = getMostRecentBrowserWindow();
  let tabId = BrowserApp.selectedTab.id

  let notification = Notification(options);

  let popupOptions = {
    persistence: -1
  };

  let { id, text, mainAction, secondaryActions } = notifications(notification).options;
  let actions = [].concat(mainAction, secondaryActions);

  NativeWindow.doorhanger.show(text, id, actions, tabId, popupOptions);

  notifications(notification).object  = {
    NativeWindow: NativeWindow,
    tabId: tabId
  }

  return notification;
}

exports.notify = notify;
