# 秘密の手帳（pass memo）

只存在本機、用主密碼加密的密碼便利貼 PWA。

## 安全設計

- 主密碼經 **PBKDF2-SHA256（60 萬次）** 產生金鑰，資料用 **AES-256-GCM** 加密後存在瀏覽器的 IndexedDB。
- 備份檔是同一份加密資料，匯入時用 AES-GCM 的驗證標籤確認密碼正確、檔案沒被竄改。
- 主密碼不會存在任何地方，**忘記就無法找回**。
- 閒置 5 分鐘自動上鎖（重新載入頁面，丟棄記憶體中的金鑰）；複製後 30 秒清除剪貼簿。
- Content-Security-Policy 禁止連到任何外部網站，App 本身完全不連網。

## 部署到 GitHub Pages

1. 在 GitHub 建立一個新的儲存庫（例如 `pass-memo`）。
2. 把這個資料夾的所有檔案上傳到儲存庫根目錄。
3. 到 Settings → Pages → Source 選 `Deploy from a branch`，Branch 選 `main`、資料夾選 `/ (root)`。
4. 幾分鐘後就能從 `https://<你的帳號>.github.io/pass-memo/` 開啟。

儲存庫裡只有程式碼，**你的資料永遠不會上傳**。

## 安裝到手機

- **Android（Pixel 等）**：用 Chrome 開啟網址 → 右上角選單「⋮」→「安裝應用程式」。也可以在 App 內的選單按「安裝到主畫面」。
- **iPhone**：用 Safari 開啟網址 → 分享 → 加入主畫面。

## 注意

- 手機和電腦的資料各自獨立，要同步請「匯出備份」再到另一台「匯入備份」。
- 清除瀏覽器資料或刪除 App 會清掉本機資料，請定期備份。
- 之後更新程式時，要修改 `sw.js` 裡的 `CACHE` 版本號，手機才會抓到新版。

標題字型 Yomogi（只收錄「秘密の手帳」五字）與內文字型 Quicksand 皆採用 SIL Open Font License（見 `fonts/OFL.txt`）。
