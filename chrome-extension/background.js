// background.js
// Clicking the extension icon opens the side panel.

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});
