# Chatty-for-GAS

Slack のチャンネルに入っているユーザーにランダムで質問していく Bot アプリ  
[colla](https://colla.jp/)を参考に作りました。

[初期は Bolt.js]()で開発していましたが、
開発者以外でも使いたいという要望をもらったのでスプレッドシートで質問管理する方法へ移行しました。

Google Apps Script だけで動作するように Bolt から clasp での開発に切り替えています。

## 動作環境

-   node v16.0.0
-   TypeScript v4.5.4
-   clasp v2.4.1

## 動作画面

動作については部屋に追加した Bot(SlackApp)が部屋に参加してるユーザーにランダムで DM を送ります。

![sa1](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/sa1.png)

入力欄に回答を入力して投稿するとメッセージが回答済みのメッセージに入れ替わります。
投稿先への遷移ボタンと間違った場合の削除ボタンを加えています。

![sa2](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/sa2.png)

部屋にもメッセージが投稿されます。

![sa3](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/sa3.png)

## 設定

### Slack App の登録

[Slack App](https://api.slack.com/apps)でアプリ作成(`Create New App`)する
**作成時に `From an app manifest (BETA)` を選択しておくと yml 貼るだけで権限登録の手続き減るのでおすすめです**

![s1](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s1.png)

対象のワークスペースを選択します

![s2](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s2.png)

次に下の yaml を貼り付けて権限周りなどの設定の登録をします

![s3](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s3.png)

yaml の中身はこんな感じです。
`request_url`の値は後に Google Apps Script の公開 URL に変更します。

```
display_information:
  name: Chatty
features:
  bot_user:
    display_name: Chatty
    always_online: true
oauth_config:
  scopes:
    bot:
      - chat:write
      - im:history
      - im:read
      - im:write
      - mpim:read
      - mpim:write
      - channels:history
      - channels:read
      - groups:history
      - groups:read
      - groups:write
settings:
  interactivity:
    is_enabled: true
    request_url: https://script.google.com/
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false
```

登録が終わったら`Create`します。

![s4](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s4.png)

後でスプレッドシートの環境変数に登録する 2 つのトークンを作成、保存しておきます。

### Slack Bot Token 取得

最初に Slack の Bot トークン(`xoxb`で始まるトークン)を取得します。
サイドメニュー -> `OAuth & Permissions` -> `OAuth Tokens for Your Workspace` -> `Install to Workspace`で作成できます。

![s5](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s5.png)

![s6](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s6.png)

無事にワークスペースに追加されるとトークンが取得できます

![s7](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s7.png)

### Slack Verification Token 取得

次に`Verification Token`を取得します。
これは最初から生成されているので値をコピーするだけです。
サイドメニュー -> `Basic Information` -> `App Credentials` -> `Verification Token`から取得できます。

![s8](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s8.png)

### Google Apps Script API を有効にする

Google Apps Script API が有効でなければ有効化しておく必要があります。
[ここからオンに切り替え](https://script.google.com/home/usersettings)できます。

![s9](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s9.png)
![s10](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s10.png)

### clasp インストール と ログイン（初回のみ）

コードの管理がしやすいように[clasp](https://github.com/google/clasp)を使用しています。

インストール

```
npm install -g @google/clasp
```

ログイン

```
clasp login --no-localhost
```

URL が出てくるのでアクセスして許可して、出てきたコードをコマンドプロンプトに入力します。
成功するとユーザールート階層に`.clasprc.json`が作られます。

### スプレッドシートとスクリプトプロジェクトの作成

このプロジェクトを clone してプロジェクト直下で  
次のコマンドを実行するとマイドライブの下にスプレッドシートが作成されます。

```
clasp create --type sheets
```

![s11](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s11.png)

成功するとスプレッドシートとスクリプトの URL が表示されます。

### シートの編集

シートが作成されたら質問を記入します。
**A 列の質問を読み取る**ようにしています。

![s12](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s12.png)

### プロジェクトの push と確認

まだ Apps Script 内も空なのでプロジェクトを push していきます。
clasp は TypeScript にも対応しているのでこのまま push すると変換してくれます。

```
clasp push
```

シートの拡張機能からか、次のコマンドでスクリプトページを開く事も可能です。

```
clasp open
```

### スクリプトプロパティの登録

古いエディターの方で設定できるので切り替えていきます。

![s13](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s13.png)

メニューからプロパティの各項目を設定していきます。

![s14](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s14.png)

-   SLACK_BOT_TOKEN
    -   [Slack Bot Token 取得の項目を参照](https://github.com/mittsu333/Chatty-for-GAS)
-   SLACK_VERIFICATION_TOKEN
    -   [Slack Verification Token 取得の項目を参照](https://github.com/mittsu333/Chatty-for-GAS)
-   CHANNEL_ID
    -   投稿先のチャンネル ID メニューの`Open channel details` -> `about`の一番下などから取得できる`C0`から始まる文字列になります。
-   BOT_ID
    -   Slack App の詳細で Bot の MemberID が取得できます

Bot の MemberID 取得場所

![s16](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s16.png)

![s15](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s15.png)

### GAS の公開

メニュー -> 公開 -> ウェブアプリケーションとして導入... を選択します

![s17](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s17.png)

デプロイ画面でバージョンやアカウント、Who has access to the app の項目は`Anyone, even anonymous`を選択します。

![s18](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s18.png)

初回の公開時には許可の確認が求められます。
警告などが表示されますが、内容を確認しながら赤枠の項目から許可をしていきます。

![s19](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s19.png)
![s20](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s20.png)
![s21](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s21.png)
![s22](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s22.png)

無事に公開が完了すれば URL が取得できるのでこれを**Slack App 設定の request_url**に設定していきます。
[Slack App の登録](https://github.com/mittsu333/Chatty-for-GAS)の yaml 内の値を上書きして保存します。

![s23](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s23.png)

### 動作確認

チャンネルを作成して、自分と Slack App を追加して関数（postQuestion）を実行すると冒頭の流れになります。

![s24](https://github.com/mittsu333/Chatty-for-GAS/blob/main/img/s24.png)

無事に動作しているなら、あとは定期実行などの処理を設定すれば完了です。
