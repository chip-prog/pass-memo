// 在畫面繪製前判斷是不是手機。
// 有些 Android 設定（例如 Chrome「電腦版網站」或較小的顯示大小）會讓頁面寬度遠大於實際螢幕，
// 所以改用「觸控 + 實體螢幕短邊 < 600」來判斷，手機一律把內容撐滿整個寬度。
(function () {
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var shortSide = Math.min(screen.width, screen.height);
  if (coarse && shortSide < 600) document.documentElement.classList.add('phone');
})();
