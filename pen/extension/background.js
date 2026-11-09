// 아이콘을 누르거나 단축키(Alt+Shift+D)를 누르면 지금 탭에 판서 도구를 넣습니다. 이미 있으면 켜고 끄기만 합니다.
chrome.action.onClicked.addListener(function (tab) {
  if (!tab || !tab.id) return;
  chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['pen-core.js'] }).catch(function () {
    // chrome:// 페이지, 크롬 웹 스토어, PDF 보기 화면 등은 확장이 들어갈 수 없습니다.
    chrome.action.setBadgeText({ tabId: tab.id, text: '✕' });
    chrome.action.setTitle({ tabId: tab.id, title: '이 화면에서는 판서를 쓸 수 없습니다 (크롬 설정·웹 스토어·PDF 화면 등)' });
  });
});
