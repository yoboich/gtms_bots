const { Telegraf, Markup, Scenes, Composer, session } = require("telegraf")
const mediaGroup = require('telegraf-media-group')
const config = require('./config')
const db = require("./db")

const bot = new Telegraf(config.BOT_TOKEN, { handlerTimeout: Infinity})

const select_platform = new Composer()
const enter_title = new Composer()
const enter_link = new Composer()
const enter_sum = new Composer()

const tasksScene = new Scenes.WizardScene("tasks", select_platform, enter_title, enter_link, enter_sum)

const send_mes = new Composer()

const broadcastScene = new Scenes.WizardScene("broadcast", send_mes)

const stage = new Scenes.Stage([tasksScene, broadcastScene])

bot.use(session())
bot.use(stage.middleware())
bot.use(mediaGroup())
stage.use(mediaGroup())
send_mes.use(mediaGroup())

const ban_list = [
    5044837362,
    6876001536
]

const admin_list = [
    5995742637,
    441931183,
    331952154
    
]

const menu = async (ctx, edit = false) => {
    try {
        
        let txt = `Choose your gang. To play, click on the POINT and earn your coins. Coins allow you to capture territory on the map and compete with other gangs.\n\n`
        txt += "Got friends?  Invite them into the game.  This way you both will earn even more coins together.\n\n"
        txt += "That's all you need to know to start playing.\n\n"

        let kb = []
        kb.push([ Markup.button.webApp("🕹️ Launch", config.WEB_APP_URL)])
        kb.push([Markup.button.url("🤙 GTM COMMUNITY", "https://t.me/gtm_ton")])
        kb.push([Markup.button.url("🎓 How to play", "https://telegra.ph/GTM-SEUZURE-06-15")])
        
        if (admin_list.includes(ctx.from.id)) {
            kb.push([Markup.button.callback("Админ панель", "admin")])
        }
        if (edit) {
            ctx.editMessageText(txt, Markup.inlineKeyboard(kb)).catch((err) => console.log(err))
        } else {
            ctx.reply(txt, Markup.inlineKeyboard(kb)).catch((err) => console.log(err))
        }
        
    } catch (e) {
        console.log(e)
    }
}


bot.command("start", async ctx => {
    if (!ban_list.includes(ctx.from.id)) {
        let ref = ctx.update.message.text.split(" ")[1]
        let friend_ref = 0
        let add_score = 100000
        let band = ''
        let multiref = false
        if (ref !== undefined) {
            if (ref.startsWith("r_")) {
                if (ref === undefined) {
                    friend_ref = 0
                    console.log(ctx.from.is_premium)
                    console.log(ref)
                } else {
                    ref = ref.replace("r_", "")
                    const data = ref.split("-")
                    if (data.length > 1) {
                        let res = await db.getMRUser("@" + data[1])
                        console.log(res)
                        if (res['tgid'] === parseInt(data[0])) {
                            multiref = true
                            friend_ref = data[0]
                        }
                    } else {
                        friend_ref = ref
                    }
                }
            }
            if (ref.startsWith("g_")) {
                if (ref === undefined) {
                    friend_ref = 0
                    console.log(ctx.from.is_premium)
                    console.log(ref)
                } else {
                    const data = ref.split("_")
                    friend_ref = data[1]
                    band = data[2]
                }
            }
        }

        let name = "" 
        if (ctx.chat.first_name) {
            name += ctx.chat.first_name
        }

        if (ctx.chat.last_name) {
            name += " " + ctx.chat.first_name
        }

        const emojiRegex = /(?:\p{Extended_Pictographic}[\p{Emoji_Modifier}\p{M}]*(?:\p{Join_Control}\p{Extended_Pictographic}[\p{Emoji_Modifier}\p{M}]*)*|\s|.)\p{M}*/guy
        name = name.trim()
        
        await db.addUser(ctx.chat.id, name, friend_ref, add_score, band, multiref)

        if (ref !== undefined) {
            if (ref.startsWith("c_")) {
                const data = ref.split("_")
                const clan = parseInt(data[1])
                const invite = parseInt(data[2])
                console.log(clan, invite)

                let clan_title = await db.getClanName(clan)
                if (clan_title) {
                    clan_title = clan_title['title']
                    await db.setUserClan(ctx.chat.id, clan_title)
                    const user = await db.getUser(ctx.chat.id)
                    const ref = await db.getUser(invite)
                    if (user) {
                        if (ref) {
                            if (user.f_clan === 0) {
                                await db.setUserScore(ctx.chat.id, user.score + 100000)
                                await db.setUserScore(ref.tgid, ref.score + 100000)
                                await db.checkFClan(ctx.chat.id)
                                console.log("here")
                            }
                        }
                    }
                }

            }
        }
        await menu(ctx)
    }

})

bot.action("menu", async (ctx) => {
    await menu(ctx, true)
})

bot.action("admin", (ctx) => {
    const txt = "Админ меню"

    let kb = []
    kb.push([Markup.button.callback("Рассылка", "broadcast")])
    kb.push([Markup.button.callback("Задания", "tasks")])
    kb.push([Markup.button.callback("Назад", "menu")])
    

    ctx.editMessageText(txt, Markup.inlineKeyboard(kb)).catch((err) => console.log(err))
})


select_platform.action("cancel", async ctx => {
    ctx.scene.leave()
    await show_tasks(ctx)
})

select_platform.action(/task_(.+)/, (ctx) => {
    const callbackString = ctx.match[0];
    const callbackData = callbackString.split("_")[1];
    ctx.wizard.state.data = {}
    ctx.wizard.state.data.platform = callbackData

    let kb = []
    kb.push([Markup.button.callback("Отмена", "cancel")])
  
    ctx.editMessageText(`Введите название задания`, Markup.inlineKeyboard(kb)).catch((err) => console.log(err));
    ctx.wizard.next()
})

enter_title.action("cancel", async ctx => {
    ctx.scene.leave()
    await show_tasks(ctx)
})

enter_title.on('text', ctx => {
    ctx.wizard.state.data.title = ctx.message.text
    let kb = []
    kb.push([Markup.button.callback("Отмена", "cancel")])
    ctx.reply(`Введите ссылку задания`, Markup.inlineKeyboard(kb)).catch((err) => console.log(err));
    ctx.wizard.next()
})

enter_link.action("cancel", async ctx => {
    ctx.scene.leave()
    await show_tasks(ctx)
})

enter_link.on('text', ctx => {
    const text = ctx.message.text
    
    const expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    const regex = new RegExp(expression);

    let kb = []
    kb.push([Markup.button.callback("Отмена", "cancel")])
    
    if (text.match(regex)) {
        ctx.wizard.state.data.link = text
        if (ctx.wizard.state.data.platform === "telegram") {
            let uname = text.replace('https://t.me/', '')
            uname = '@' + uname
            bot.telegram.getChatMember(uname, bot.botInfo.id)
            .then(v => {
                ctx.reply(`Введите награду за задание`, Markup.inlineKeyboard(kb)).catch((err) => console.log(err));
                ctx.wizard.next()
            })
            .catch(e => {
                ctx.reply(`Вы не добавляли бота в этот канал`, Markup.inlineKeyboard(kb)).catch((err) => console.log(err));
            })
        } else {
            ctx.reply(`Введите награду за задание`, Markup.inlineKeyboard(kb)).catch((err) => console.log(err));

            ctx.wizard.next()
        }
    } else {
        ctx.reply(`Неверная ссылка, пожалуйста отправьте верную ссылку еще раз`, Markup.inlineKeyboard(kb)).catch((err) => console.log(err));
    }
})

enter_sum.action("cancel", async ctx => {
    ctx.scene.leave()
    await show_tasks(ctx)
})

enter_sum.on('text', ctx => {
    const text = ctx.message.text
    
    const expression = /^[+]?\d+([.]\d+)?$/;
    const regex = new RegExp(expression);
    
    if (text.match(regex)) {
        const data = ctx.wizard.state.data
        let kb = []
        kb.push([Markup.button.callback("Рассылка", "broadcast")])
        kb.push([Markup.button.callback("Задания", "tasks")])
        kb.push([Markup.button.callback("Назад", "menu")])
        db.addTask(data.platform, data.title, data.link, ctx.message.text).then(async c => {
            ctx.session.data.page = 1
            await show_tasks(ctx, `Задание успешно добавлена!`, [], false)
        })
        ctx.scene.leave()
    } else {
        let kb = []
        kb.push([Markup.button.callback("Отмена", "cancel")])

        ctx.reply(`Неверная сумма награды, пожалуйста отправьте верную сумму еще раз`, Markup.inlineKeyboard(kb));
    }
    
})

const show_tasks = async (ctx, txt = '', hide_id = [], edit = true) => {
    
    const page = ctx.session.data.page
    const page_div = 6

    const content = await db.getTasks()
    let kb = []
        
    

    if (content.length < 1) {
        kb.push([Markup.button.callback("Пусто", "empty")])
    } else {
        let show = await db.getTasks()
        show = show.slice((page - 1) * page_div, Math.min(content.length, ((page - 1) * page_div) + page_div))
        show.forEach(v => {
            (!hide_id.includes(v.id)) && kb.push([Markup.button.callback(v.title, `task_${v.id}`)])
        })

        arrow_kb = []
        if (page > 1) {
            arrow_kb.push(Markup.button.callback("<", "prev_page"))
        } else {
            arrow_kb.push(Markup.button.callback("<", "fake"))
        }
        console.log((page * page_div), content.length)
        if ((page * page_div) < content.length) {
            arrow_kb.push(Markup.button.callback(">", "next_page"))
        } else {
            arrow_kb.push(Markup.button.callback(">", "fake"))
        }
        kb.push(arrow_kb)
    }
    
    kb.push([Markup.button.callback("Добавить", "add_task")])
    kb.push([Markup.button.callback("Назад", "admin")])
    let ftext = "Текущие задачи:"
    if (txt) {
        ftext = txt
    }
    if (edit) {
        ctx.editMessageText(ftext, Markup.inlineKeyboard(kb)).catch((err) => console.log(err))
    } else {
        ctx.reply(ftext, Markup.inlineKeyboard(kb)).catch((err) => console.log(err))
    }
    
}

bot.action(/task_(.+)/, async (ctx) => {
    const platforms = {
        "telegram": "Telegram",
        "x": "Twitter (X)",
        "youtube": "Youtube",
        "discord": "Discord"
    }
    const callbackString = ctx.match[0];
    const callbackData = callbackString.split("_")[1];
    const task = await db.getTask(callbackData)
    let txt = `<b>Платформа:</b> ${platforms[task.type]}\n`
    txt += `<b>Название: </b> ${task.title}\n`
    txt += `<b>Ссылка: </b> ${task.link}\n`
    txt += `<b>Награда: </b> ${task.bonus} GTM\n`

    let kb = []
    kb.push([Markup.button.callback("Удалить", `delete_${callbackData}`)])
    kb.push([Markup.button.callback("Назад", "tasks")])

    ctx.editMessageText(txt, { reply_markup: { inline_keyboard: kb }, parse_mode: "HTML", disable_web_page_preview: true}).catch((err) => console.log(err))

})

bot.action(/delete_(.+)/, async (ctx) => {
    const callbackString = ctx.match[0];
    const callbackData = callbackString.split("_")[1];
    ctx.session.data.page = 1
    await db.deleteTask(callbackData)
    await show_tasks(ctx, "Задача успешно удалена!")
})

bot.action("tasks", async (ctx) => {
    ctx.session.data = {}
    ctx.session.data.page = 1
    await show_tasks(ctx)
    
})

bot.action("next_page", async (ctx) => {
    ctx.session.data.page = ctx.session.data.page + 1
    await show_tasks(ctx)   
})

bot.action("prev_page", async (ctx) => {
    ctx.session.data.page = ctx.session.data.page - 1
    await show_tasks(ctx)   
})

bot.action("add_task", (ctx) => {
    const txt = "Выберите платформу"

    let kb = []
    kb.push([Markup.button.callback("Twitter (X)", "task_x")])
    kb.push([Markup.button.callback("Telegram", "task_telegram")])
    kb.push([Markup.button.callback("Youtube", "task_youtube")])
    kb.push([Markup.button.callback("Discord", "task_discord")])
    kb.push([Markup.button.callback("Отмена", "cancel")])
    
    ctx.editMessageText(txt, Markup.inlineKeyboard(kb)).catch((err) => console.log(err))
    ctx.scene.enter("tasks")

})

bot.action("broadcast", (ctx) => {
    const txt = "Отправьте сообщение которое хотите разослать пользователям"

    let kb = []
    kb.push([Markup.button.callback("Назад", "cancel")])
    
    ctx.editMessageText(txt, Markup.inlineKeyboard(kb)).catch((err) => console.log(err))
    ctx.scene.enter("broadcast")
})



send_mes.action("cancel", ctx => {
    const txt = "Админ меню"

    let kb = []
    kb.push([Markup.button.callback("Рассылка", "broadcast")])
    kb.push([Markup.button.callback("Задания", "tasks")])
    kb.push([Markup.button.callback("Назад", "menu")])
    
    ctx.scene.leave()
    ctx.editMessageText(txt, Markup.inlineKeyboard(kb)).catch((err) => console.log(err))
})

send_mes.on("text", async ctx => {
    ctx.wizard.state.data = {}
    ctx.wizard.state.data.mid = [ctx.message.message_id]
    await ctx.copyMessage(ctx.from.id)

    let kb = []
    kb.push([Markup.button.callback("Да", "send")])
    kb.push([Markup.button.callback("Отмена", "cancel")])
    await ctx.reply("Отправить сообщение выше?", Markup.inlineKeyboard(kb)).catch((err) => console.log(err))
})

send_mes.on('media_group', async (ctx) => {
    ctx.wizard.state.data = {}
    ctx.wizard.state.data.mid = []
    // ctx.mediaGroup — an array of album messages (including the last one)
    for (const message of ctx.mediaGroup) {
        ctx.wizard.state.data.mid.push(message.message_id)
    }
    await ctx.copyMessages(ctx.from.id, ctx.wizard.state.data.mid)

    let kb = []
    kb.push([Markup.button.callback("Да", "send")])
    kb.push([Markup.button.callback("Отмена", "cancel")])
    await ctx.reply("Отправить сообщение выше?", Markup.inlineKeyboard(kb)).catch((err) => console.log(err))
})

send_mes.on("photo", async ctx => {
    if (!ctx.message.media_group_id) {
        ctx.wizard.state.data = {}
        ctx.wizard.state.data.mid = [ctx.message.message_id]
        await ctx.copyMessage(ctx.from.id)
    
        let kb = []
        kb.push([Markup.button.callback("Да", "send")])
        kb.push([Markup.button.callback("Отмена", "cancel")])
        await ctx.reply("Отправить сообщение выше?", Markup.inlineKeyboard(kb)).catch((err) => console.log(err))
    }
    
})

const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


send_mes.action("send", async ctx => {
    const users = await db.getUsers()
    const userIds = users.map(v => v.tgid)

    const userIdArray = [...userIds];
    const userChunks = chunkArray(userIdArray, 30); // Разбиваем на пакеты по 30 пользователей
    await ctx.editMessageText('Отправляем...').catch((err) => console.log(err));
    for (const chunk of userChunks) {
        const sendMessages = chunk.map(userId => {
            return async () => {
                bot.telegram.copyMessages(userId, ctx.from.id, ctx.wizard.state.data.mid)
                .catch(error => {
                    console.error(`Не удалось отправить сообщение пользователю ${userId}:`, error);
                }).then(() => console.log(`sended ${userId}`))
            }
        });

        // Выполняем все функции и ждем их завершения
        await Promise.all(sendMessages.map(send => send()));
        console.log('Отправил')
        await delay(2000);
    }
    await ctx.scene.leave()
    let kb = []
        kb.push([Markup.button.callback("Рассылка", "broadcast")])
        kb.push([Markup.button.callback("Задания", "tasks")])
        kb.push([Markup.button.callback("Назад", "menu")])
    await ctx.reply('Сообщение успешно отправлено всем пользователям!', Markup.inlineKeyboard(kb)).catch((err) => console.log(err));
});


bot.launch({dropPendingUpdates: true})
