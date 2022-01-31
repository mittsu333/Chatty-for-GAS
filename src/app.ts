const token = PropertiesService.getScriptProperties().getProperty("SLACK_BOT_TOKEN") || ""
const legacyVerificationToken = PropertiesService.getScriptProperties().getProperty("SLACK_VERIFICATION_TOKEN")
const channelId = PropertiesService.getScriptProperties().getProperty("CHANNEL_ID") || ""
const botId = PropertiesService.getScriptProperties().getProperty("BOT_ID")

type SlackPayload = {
    token: string
    user?: {
        id: string
        username: string
    }
    team: {
        domain: string
    }
    message: {
        ts: string
        blocks?: [
            {
                block_id: string
                text?: {
                    text?: string
                }
            },
            {
                block_id: string
                text?: {
                    text?: string
                }
            }
        ]
    }
    state: {
        values: {
            [block_id_key: string]: {
                [action_id_key: string]: {
                    type?: string
                    value?: string
                }
            }
        }
    }
    actions: [
        {
            action_id: string
            block_id: string
            value?: string
            action_ts: string
        }
    ]
}

class EventTrigger {
    // ユーザー選択割合
    private selectRate = 3
    // ユーザー選択上限数
    private selectLimitCount = 5
    // スプレッドシート
    private sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()
    // シート内の質問一覧の開始行列番号
    private questoinStartRow = 1
    private questoinStartColumn = 1
    // BLockKitのアクションID
    private answerAction = "answer_action"
    private nextQuestionAction = "next_question_action"
    private textInputAction = "plain_text_input_action"
    private deleteAction = "posted_msg_delete_action"

    /** チャットルームに参加しているユーザーにランダムでDMを送る **/
    public async fire() {
        if (!channelId.startsWith("C0")) {
            console.log("EventTrigger/fire(): channel_id not found")
            return
        }
        if (!this.isHoliday()) {
            const sendMemners = await this.pickup()
            console.log(`EventTrigger/fire(): sendMemners=${sendMemners}`)
        } else {
            console.log("EventTrigger/fire(): isHoliday")
        }
    }

    /** アクションイベントの解析 **/
    public async actionParse(payload: SlackPayload) {
        if (channelId.startsWith("C0")) {
            if (!payload.actions.length || !payload.message.blocks) {
                console.log("EventTrigger/actionParse(): data not found")
                return
            }
            const actions = payload.actions[0]
            const blocks = payload.message.blocks!
            const postUserId = payload.user?.id || ""
            if (actions.action_id === this.answerAction) {
                const [userName, question, answer] = [
                    payload.user?.username || "",
                    blocks[0].text?.text || "",
                    payload.state.values[blocks[1].block_id][this.textInputAction].value,
                ]
                if (!answer) {
                    console.log("EventTrigger/actionParse(): answer is undefined")
                    return
                }
                const postMessage = `> ${question}\n\n${answer}`
                const res = await this.callWebApi(token, "chat.postMessage", {
                    channel: channelId,
                    type: "mrkdwn",
                    text: `${userName}さんに聞きました。\n${postMessage}`,
                    unfurl_links: false,
                    unfurl_media: false,
                })
                const responseJson = JSON.parse(res.getContentText())
                if (responseJson.ok) {
                    const param = `p${responseJson.ts.replace(".", "")}`
                    const postedUrl = `https://${payload.team.domain}.slack.com/archives/${responseJson.channel}/${param}`
                    await this.callWebApi(token, "chat.delete", {
                        channel: postUserId,
                        ts: payload.message.ts,
                    })
                    await this.callWebApi(token, "chat.postMessage", {
                        channel: postUserId,
                        blocks: this.postSuccessMessage(postMessage, postedUrl, responseJson.ts),
                        unfurl_links: false,
                        unfurl_media: false,
                    })
                } else {
                    await this.callWebApi(token, "chat.postMessage", {
                        channel: postUserId,
                        text: "投稿に失敗しました。",
                    })
                }
            } else if (actions.action_id === this.nextQuestionAction) {
                const filter: string[] = actions.value?.split(",") || []
                await this.callWebApi(token, "chat.delete", {
                    channel: postUserId,
                    ts: payload.message.ts,
                })
                await this.callWebApi(token, "chat.postMessage", {
                    channel: postUserId,
                    blocks: this.postQuestion(channelId, filter),
                    unfurl_links: false,
                    unfurl_media: false,
                })
            } else if (actions.action_id === this.deleteAction) {
                await this.callWebApi(token, "chat.delete", {
                    channel: channelId,
                    ts: actions.value,
                })
                await this.callWebApi(token, "chat.delete", {
                    channel: postUserId,
                    ts: payload.message.ts,
                })
            }
        }
    }

    /** 土日祝日判定 **/
    private isHoliday() {
        const today = new Date()
        // 最初に土日かチェック
        const weekend = today.getDay()
        if (weekend == 0 || weekend == 6) {
            console.log(`isHoliday: weekend=${weekend}`)
            return true
        }
        // Googleカレンダーを使用して日本の祝日チェック
        const calendar = CalendarApp.getCalendarById("ja.japanese#holiday@group.v.calendar.google.com")
        const publicHoliday = calendar.getEventsForDay(today)
        if (publicHoliday.length) {
            console.log(`isHoliday: publicHoliday=${publicHoliday}`)
            return true
        }
        return false
    }

    private shuffle(array?: string[]): string[] {
        var shuffleArr = array ?? []
        if (!shuffleArr.length) {
            return shuffleArr
        }
        for (var i = shuffleArr.length; 1 < i; i--) {
            const k = Math.floor(Math.random() * i)
            ;[shuffleArr[k], shuffleArr[i - 1]] = [shuffleArr[i - 1], shuffleArr[k]]
        }
        return shuffleArr
    }

    private async pickup() {
        var pickupList: string[] = []
        if (channelId.startsWith("C0")) {
            const response = await this.callWebApi(token, "conversations.members", {
                channel: channelId,
            })
            const responseJson = JSON.parse(response.getContentText())
            if (responseJson.ok) {
                const botFilterMembers = responseJson.members?.filter((id: string) => id != botId) ?? []
                const shuffleMembers = this.shuffle(botFilterMembers) ?? []
                if (shuffleMembers.length) {
                    const selectCount = Math.min(
                        Math.ceil(shuffleMembers.length / this.selectRate),
                        this.selectLimitCount
                    )
                    pickupList = shuffleMembers.slice(0, selectCount)
                    await Promise.all(
                        pickupList.map(
                            async (channelId) =>
                                await this.callWebApi(token, "chat.postMessage", {
                                    channel: channelId,
                                    blocks: this.postQuestion(channelId),
                                    unfurl_links: false,
                                    unfurl_media: false,
                                })
                        )
                    )
                }
            }
        }
        return pickupList
    }

    private postQuestion(channelId: string, filterQuestion: string[] = []) {
        const questionValues = this.sheet
            .getRange(
                this.questoinStartRow,
                this.questoinStartColumn,
                this.sheet.getLastRow() - (this.questoinStartRow - 1)
            )
            .getValues()
        if (!questionValues.length) {
            console.log("postQuestion: no value in the sheet")
            return
        }
        if (filterQuestion.length >= questionValues.length) {
            filterQuestion = []
        }
        const questions = questionValues.reduce((map, value, index) => {
            const key = `q${index}`
            if (!filterQuestion.includes(key)) {
                map.set(key, value[0] as string)
            }
            return map
        }, new Map<string, string>())

        const keys = Array.from(questions.keys())
        const selectKey = keys[Math.floor(Math.random() * questions.size)]
        const filterValues = filterQuestion.concat([selectKey || ""])
        return JSON.stringify([
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: questions.get(selectKey) || "",
                },
            },
            {
                type: "input",
                element: {
                    type: "plain_text_input",
                    multiline: true,
                    action_id: this.textInputAction,
                    placeholder: {
                        type: "plain_text",
                        text: "回答を入力する",
                    },
                },
                label: {
                    type: "plain_text",
                    text: " ",
                    emoji: true,
                },
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "他の質問にする",
                            emoji: true,
                        },
                        value: filterValues.join(),
                        action_id: this.nextQuestionAction,
                    },
                    {
                        type: "button",
                        style: "primary",
                        text: {
                            type: "plain_text",
                            text: "投稿する",
                            emoji: true,
                        },
                        value: channelId,
                        action_id: this.answerAction,
                    },
                ],
            },
        ])
    }

    private postSuccessMessage(postedMessage: string, url: string, ts: string) {
        return JSON.stringify([
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `投稿しました。\n\n${postedMessage}`,
                },
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        style: "danger",
                        text: {
                            type: "plain_text",
                            text: "投稿を削除する",
                            emoji: true,
                        },
                        value: ts,
                        action_id: this.deleteAction,
                    },
                    {
                        type: "button",
                        style: "primary",
                        text: {
                            type: "plain_text",
                            text: "投稿を確認する",
                            emoji: true,
                        },
                        url: url,
                        action_id: "show_posted_message",
                    },
                ],
            },
        ])
    }

    private async callWebApi(token: string, apiMethod: string, payload: any) {
        console.log(`Web API (${apiMethod}) request: ${payload}`)
        const response = UrlFetchApp.fetch(`https://www.slack.com/api/${apiMethod}`, {
            method: "post",
            contentType: "application/x-www-form-urlencoded",
            headers: { Authorization: `Bearer ${token}` },
            payload: payload,
        })
        console.log(`Web API (${apiMethod}) response: ${response}`)
        return response
    }
}

function postQuestion() {
    console.log("eventCall: start")
    const event = new EventTrigger()
    event.fire()
    console.log("eventCall: end")
}

async function doPost(e: any) {
    if (!e.postData) {
        return ack("invalid request")
    }
    if (e.postData.type === "application/x-www-form-urlencoded" && e.parameters.payload) {
        const payload = JSON.parse(e.parameters.payload) as SlackPayload
        // Verification Token の検証
        if (payload.token !== legacyVerificationToken) {
            return ack("invalid token request")
        }
        const event = new EventTrigger()
        event.actionParse(payload)
    }
    return ack("")
}

function ack(payload: string) {
    return ContentService.createTextOutput(payload)
}
