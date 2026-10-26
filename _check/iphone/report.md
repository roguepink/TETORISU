# iPhone・Android で開けるか  2026-10-26 17:32
対象: /Users/nobu/claude-work/TETORISU

○ iPhone_SE            #/             OK
○ iPhone_SE            ?g=1#noinstall OK
○ iPhone_8_SE2         #/             OK
○ iPhone_8_SE2         ?g=1#noinstall OK
○ iPhone_15            #/             OK
○ iPhone_15            ?g=1#noinstall OK
○ iPhone_15_ProMax     #/             OK
○ iPhone_15_ProMax     ?g=1#noinstall OK
○ iPhone_LINE          #/             OK
○ iPhone_LINE          ?g=1#noinstall OK
○ iPhone_保存できない        #/             OK
○ iPhone_保存できない        ?g=1#noinstall OK
○ Android_Pixel7       #/             OK
○ Android_Pixel7       ?g=1#noinstall OK
○ Android_LINE         #/             OK
○ Android_LINE         ?g=1#noinstall OK

古い iPhone(iOS 15.4 以上)で動かない書き方: 0 件
確かめたほうがよい所: 4 件
  △ index.html:3056 [fullscreen] iPhone(iPad 以外)では requestFullscreen が使えない
  △ index.html:68 [font-input] iPhone は文字の大きさが 16px 未満の入力欄をさわると画面が勝手に拡大される
  △ src/index.html:40 [font-input] iPhone は文字の大きさが 16px 未満の入力欄をさわると画面が勝手に拡大される
  △ src/js/main.js:25 [fullscreen] iPhone(iPad 以外)では requestFullscreen が使えない

画像: /Users/nobu/claude-work/TETORISU/_check/iphone  ← かならず目で見る(まっ白・くずれ)