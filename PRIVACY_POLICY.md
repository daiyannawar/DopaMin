# DopaMin — Privacy Policy

**Last updated:** 29/05/2026
**Extension version:** 1.0.0
**Developer:** Daiyan Nawar
**Contact:** daiyannawar01@gmail.com

---

## Overview

DopaMin is a browser productivity extension that helps you manage time spent on distracting websites. We take your privacy seriously. This policy explains exactly what data we handle, where it lives, and what we do (and don't do) with it.

**The short version: all your data stays on your device. We collect nothing. We store nothing on any server. We share nothing with anyone.**

---

## 1. What Data the Extension Handles

DopaMin stores the following data **locally on your device only**, using Chrome's built-in `chrome.storage.local` API:

| Data | What it is | Where it's stored |
|---|---|---|
| Your "Why" statement | A short text description of your current focus goal | Your device only |
| Your goals list | The goal statements you enter for the Typo Trap unlock | Your device only |
| Your Slop List | The URLs you've marked as restricted | Your device only |
| Daily time budget | Your chosen allowance in minutes | Your device only |
| Daily usage counter | Seconds spent on restricted sites today | Your device only |
| Bonus time earned | Seconds unlocked via the Typo Trap | Your device only |

This data is **never transmitted** to any external server, database, or third-party service — including to the developer.

---

## 2. Data We Do NOT Collect

DopaMin does **not** collect, transmit, or store any of the following:

- Your browsing history or visited URLs
- Personal information (name, email, age, location, etc.)
- Usage analytics or telemetry
- Crash reports
- Any form of device identifiers
- Financial or payment information
- Any data from the content of pages you visit

---

## 3. Permissions Explained

DopaMin requests the following Chrome permissions, each with a specific, limited purpose:

**`storage`**
Used to save your settings (goals, slop list, budget) and daily usage counter locally on your device. No data leaves your machine.

**`alarms`**
Used to schedule a daily reset of your time budget at midnight. This happens entirely locally — no network connection is made.

**`tabs`**
Used to determine whether the currently active tab is a restricted site, so the timer knows when to count. No tab data is recorded or transmitted.

**`<all_urls>` (Host Permission)**
Required so the content script can run on any website and check whether the page URL matches your slop list. DopaMin does not read, record, or transmit any content from any webpage. This permission is used solely to inject the block overlay on matching URLs.

---

## 4. Third-Party Services

DopaMin does not use any third-party services, analytics platforms, advertising networks, or external APIs. There are no tracking pixels, no telemetry SDKs, and no external script imports.

---

## 5. Children's Privacy

DopaMin does not knowingly collect any data from anyone, including children under the age of 13. Since no data is collected at all, the extension is suitable for use by any age group.

---

## 6. Data Security

Because all data is stored locally using Chrome's storage APIs, its security is tied to the security of your Chrome profile and device. We recommend keeping your browser and operating system up to date.

---

## 7. Data Deletion

To delete all data stored by DopaMin:

1. Open Chrome and go to `chrome://extensions`
2. Find DopaMin and click **Remove**
3. Confirm removal

This will permanently delete all locally stored settings and usage data.

Alternatively, you can clear the extension's storage without uninstalling by clicking **"Reset today's usage"** in the Options page, or by clearing Chrome's local storage via DevTools.

---

## 8. Changes to This Policy

If we make material changes to this privacy policy, we will update the "Last updated" date at the top of this document and increment the extension version. Continued use of the extension after changes constitutes acceptance of the updated policy.

---

## 9. Contact

If you have any questions or concerns about this privacy policy, please contact:

**Daiyan Nawar**\
**daiyannawar01@gmail.com**\
**github.com/wdl-dai**\

---

*This privacy policy applies solely to the DopaMin Chrome extension and does not apply to any other products or services.*
