// 地域リストを表示するシンプルなアプリ

const regionList = document.getElementById("regionList");

// ダミーデータ（例）
const regions = [
  { name: "北海道", checked: false },
  { name: "東京", checked: false },
  { name: "大阪", checked: false },
  { name: "福岡", checked: false },
  { name: "沖縄", checked: false }
];

// 表示を更新
function render() {
  regionList.innerHTML = "";
  
  regions.forEach((region, index) => {
    const li = document.createElement("li");
    li.className = "region-item";
    
    const text = document.createElement("span");
    text.textContent = region.name;
    
    li.appendChild(text);
    regionList.appendChild(li);
  });
}

// 初期表示
render();

// PWA: Service Worker 登録
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js")
    .then(() => console.log("Service Worker registered"))
    .catch(err => console.log("SW registration failed:", err));
}


