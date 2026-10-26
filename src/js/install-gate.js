'use strict';
/* はじめの画面(Google Play 風: インストールして遊ぶ / このまま遊ぶ)の中身。見本は roguepink/sokai。 */
window.INSTALL_GATE = {
  id: 'TETORISU',
  name: 'TETORISU',
  icon: 'icons/icon-192.png',
  color: '#ff5e8a',
  tagline: 'テトリス×ぷよぷよ シューティング',
  badges: ['無料', '広告なし', '登録なし', 'スマホは横向き'],
  shots: ['shots/1.jpg', 'shots/2.jpg', 'shots/3.jpg', 'shots/4.jpg', 'shots/5.jpg'],
  desc: 'かわいい飛行機に乗って、テトリスのブロックの形をした弾で、ぷよぷよのような敵を打ちぬく 横スクロールのシューティング。同じ色の敵がとなりにいると、まとめてはじけて「れんさ」になります。',
  points: ['武器はブロックの形で10種類。まっすぐ飛ぶ武器ほど強い', '機体のまわりに 小さなお供が4つまでついて、ハートのミサイルで手伝ってくれる', 'ステージは8つ。空、お菓子の海、神社、夜の街、火山、洞窟、オーロラ、ブロックの世界'],
  playLabel: '▶ このまま遊ぶ'
};

/* 部品の install.js(ROGUE PINK 共通の はじめの画面。中身は書きかえない)は、説明書きに script を閉じる字があって
   1ファイルにまとめられないので、ここから 別のファイルとして読みこむ。電波がないときは sw.js が覚えた install.js を使う。
   読みこむまでの一瞬、ゲームの画面が見えてしまわないよう、はじめの画面と同じ色の幕をかけておく(出さないときは かけない)。 */
(function () {
  var C = window.INSTALL_GATE;
  var mm = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var standalone = mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)') || navigator.standalone === true;
  var hide = false;
  try { hide = localStorage.getItem('ig-' + C.id + '-hide') === '1'; } catch (e) {}
  var cover = null;
  if (!standalone && !hide && !/play|auto|noinstall/.test(location.hash || '')) {
    cover = document.createElement('div');
    cover.style.cssText = 'position:fixed;inset:0;z-index:2147482999;background:rgb(8,6,14)';
    document.body.appendChild(cover);
  }
  var done = function () { if (cover && cover.parentNode) cover.parentNode.removeChild(cover); cover = null; };
  var s = document.createElement('script');
  s.src = 'install.js';
  s.onload = done; s.onerror = done;
  setTimeout(done, 4000);
  document.body.appendChild(s);
})();
