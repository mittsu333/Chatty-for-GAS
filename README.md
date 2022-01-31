# Chatty-for-GAS

Slack のチャンネルに入っているユーザーにランダムで質問していく Bot アプリ  
[colla](https://colla.jp/)を参考に作りました。

[初期は Bolt.js](https://github.com/mittsu333/Chatty)で開発していましたが、
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

## 使い方

[wiki の設定](https://github.com/mittsu333/Chatty-for-GAS/wiki/%E8%A8%AD%E5%AE%9A)に手順を記載しています
