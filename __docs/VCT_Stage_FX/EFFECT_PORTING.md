# Heart・Stars・紙吹雪・Sparkleの共有描画部品

作者製コード、MIT License。[テンプレート直下のライセンス](../../VCT_Stage_FX/LICENSE)を保持してください。Heart・StarsのSVG形状と紙片のCSSはコードで描画し、絵文字・外部画像・生成AI画像は使用しません。

## 役割と再利用

[celebration.js](../../VCT_Stage_FX/effects/shared/celebration.js)と[style.css](../../VCT_Stage_FX/effects/shared/style.css)は描画専用です。OneSDK、VCTStage、設定キー、Plugin登録、保存処理へ依存しません。各演出のmain.jsがStageのManifest・設定キー・強度・終了方式を接続します。

別ガジェットへ持ち込む場合は両ファイルをコピーし、読込と登録をそのガジェットの方式で追加します。ファイル共有・自動同期は行いません。今回別ガジェットでの動作検証は実施していません。

```js
VCTCelebration.play('heart', {
  root: context.root,
  size: { width: 1920, height: 1080 },
  animations: context.animations
}, {
  count: 18, size: 80, colors: '#ff598b', speed: 100,
  duration: 3000, intensity: 'standard'
});
```

rootはposition付きの描画先、sizeはその論理座標寸法、animations.animateはWeb Animations互換の引数を受け取る管理機構です。呼出元がrootと全アニメーションの破棄を所有します。本部品は終了通知や独自タイマーを作りません。

kindはheart／stars／confetti／sparkle。Sparkleは移動せず、十字のSVGを拡大・縮小して輝かせます。Starsはdirectionにright／left／randomを指定でき、randomは一回の演出内で同じ方向になります。colorsは6桁HEXのカンマ区切り。不正な色を除き、有効色がなければ演出の初期色へ戻します。

plan(kind, options, size, random)はDOMを触らず、粒ごとの位置・時間・キーフレームを返します。乱数関数を渡すことで再現可能な検証ができます。

## 移植元との比較

参照元：作者製「OBS Screen Effect V2」のparticle_effect、confetti_effect、js/effect-context.js。移植元は参照のみ行い、変更していません。

- 共通点：root、animations.animate、Contextによる停止・破棄の考え方。
- 違い：元のapiVersion:2／REGISTERED_EFFECTSとStageのstageApi:1／registry、fieldsとsettings、平坦化パラメータとparams.settings、画面のvhと論理px、effect終了型と今回のhost終了型。
- 元の紙吹雪は負の遅延で途中位置から見せます。今回は全面に初期位置を分散し、正の時間差でポップしてから落ちるため、動きは再構成しています。

既存Pluginの無修正互換はありません。今回の共有化は、今後同じ見た目を増やすときに描画処理を書き直さず、登録・設定・座標寸法・終了管理の接続へ作業を限定するためのものです。OBS Screen Effect V2への接続実装は含めません。

## 時間・負荷

Sparkleの出現遅延は全体時間の0～62％、寿命は24～36％です。他の演出の出現遅延は全体時間の0～22％、各粒の寿命は概ね64～76％で、最後の粒も全体時間より60ms以上前に消えます。速度変更は移動距離へ反映し、寿命自体は変えません。画面外へ出た粒はコンテナでクリップされます。

個体サイズには±20％の差を付けます。強度は数へ0.6／1／1.45／2倍を適用し、最終粒数は1～60に制限します。基本サイズは最大200px、個体の絶対上限は260px。紙吹雪は基本サイズ最大40px、Starsは160pxまでをUIで指定します。時間は1200～10000msで、Stageの15秒強制終了枠を変えません。
