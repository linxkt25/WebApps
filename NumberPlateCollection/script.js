// -----------------------------
// DOM 要素の取得
// -----------------------------
const input = document.getElementById("regionInput");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("regionList");

// -----------------------------
// ローカルストレージからデータ読み込み
// -----------------------------
let regions = JSON.parse(localStorage.getItem("regions")) || [];

// -----------------------------
// 初期表示
// -----------------------------
render();

// -----------------------------
// 「追加」ボタンの処理
// -----------------------------
addBtn.addEventListener("click", () => {
  const region = input.value.trim();
  if (!region) return;

  // 重複チェック
  if (regions.includes(region)) {
    alert("この地域はすでに登録されています");
    return;
  }

  // 新規追加
  regions.push(region);
  localStorage.setItem("regions", JSON.stringify(regions));

  input.value = "";
  render();
});

// -----------------------------
// 表示更新
// -----------------------------
function render() {
  list.innerHTML = "";
  regions.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r;
    list.appendChild(li);
  });
}

// -----------------------------
// PWA: Service Worker 登録
// -----------------------------
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js")
    .then(() => console.log("Service Worker registered"))
    .catch(err => console.log("SW registration failed:", err));
}
