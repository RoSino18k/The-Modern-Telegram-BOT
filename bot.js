/*

by @RoSino18k 2025
 
*/
// Nhập các thư viện cần thiết
const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');
const express = require('express');
const fs = require('fs');
require('dotenv').config();
const { writeFileSync, readFileSync } = require('fs');
const usersFile = './users.json';
const RIGHTS = {
    SUPERUSER: 9,
    ADVANCEDUSER: 4,
    PRIMARYUSER: 2,
    NONE: 0
};
const RIGHT_NAMES = {
    superuser: RIGHTS.SUPERUSER,
    advanceduser: RIGHTS.ADVANCEDUSER,
    primaryuser: RIGHTS.PRIMARYUSER,
    none: RIGHTS.NONE
};

// Khởi tạo file nếu chưa tồn tại
if (!fs.existsSync(usersFile)) {
    writeFileSync(usersFile, JSON.stringify([]));
}

// Khởi tạo Express app
const app = express();
app.use(express.json()); // Middleware để parse JSON từ Telegram

// Kiểm tra biến môi trường
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_IP = process.env.WEBHOOK_IP;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN || !WEBHOOK_IP) {
    console.error('Lỗi: Thiếu BOT_TOKEN hoặc WEBHOOK_IP trong file .env');
    process.exit(1);
}

// Khởi tạo bot với token
const bot = new Telegraf(BOT_TOKEN, {
    telegram: {
        webhookReply: true, // Cho phép phản hồi qua webhook
        apiRoot: 'https://api.telegram.org', // API Telegram mặc định
    },
});

// Middleware logging để theo dõi các update
bot.use(async (ctx, next) => {
    console.log('Nhận update:', JSON.stringify(ctx.update, null, 2));
    return next(); // Xử lý tất cả update
});

// Xử lý lệnh /start
bot.command('start', async (ctx) => {
    console.log('Xử lý lệnh /start từ:', ctx.from);
    try {
        const user = {
            id: ctx.from.id,
            first_name: ctx.from.first_name,
            last_name: ctx.from.last_name || '',
            username: ctx.from.username || '',
            chatId: ctx.chat.id,
            right: RIGHTS.NONE
        };
        const users = JSON.parse(readFileSync(usersFile));
        if (!users.some(u => u.id === user.id)) {
            users.push(user);
            writeFileSync(usersFile, JSON.stringify(users));
        }
        await ctx.reply('Chào mừng bạn đến với bot! Gõ /help để xem các lệnh.');
    } catch (err) {
        console.error('Lỗi gửi phản hồi /start:', err);
    }
});
bot.command('broadcast', async (ctx) => {
    const users = JSON.parse(fs.readFileSync(usersFile));
    const user = users.find(u => u.id === ctx.from.id);
    if (!user || user.right < RIGHTS.SUPERUSER) {
        return ctx.reply('Chỉ Super User được dùng lệnh này!', { reply_to_message_id: ctx.message.message_id });
    }
    const message = ctx.message.text.split(' ').slice(1).join(' ');
    if (!message) {
        return ctx.reply('Vui lòng nhập tin nhắn: /broadcast <tin nhắn>');
    }
    let successCount = 0, failCount = 0;
    for (const user of users) {
        try {
            await bot.telegram.sendMessage(user.chatId, message);
            successCount++;
            await new Promise(resolve => setTimeout(resolve, 50)); // Độ trễ 50ms
        } catch (err) {
            console.error(`Lỗi gửi tới ${user.chatId}:`, err.message);
            failCount++;
        }
    }
    await ctx.reply(`Gửi xong! Thành công: ${successCount}, Thất bại: ${failCount}`);
});
bot.command('listusers', async (ctx) => {
    const users = JSON.parse(fs.readFileSync(usersFile));
    const user = users.find(u => u.id === ctx.from.id);
    if (!user || user.right < RIGHTS.SUPERUSER) {
        return ctx.reply('Chỉ Super User được dùng lệnh này!', { reply_to_message_id: ctx.message.message_id });
    }
    if (users.length === 0) {
        return ctx.reply('Chưa có người dùng nào!', { reply_to_message_id: ctx.message.message_id });
    }
    const userList = users.map(u =>
        `ID: ${u.id}, Tên: ${u.first_name}${u.last_name ? ' ' + u.last_name : ''}, Username: ${u.username || 'Không có'}, Quyền: ${u.right === RIGHTS.SUPERUSER ? 'Super User' : u.right === RIGHTS.ADVANCEDUSER ? 'Advanced User' : u.right === RIGHTS.PRIMARYUSER ? 'Primary User' : 'None'}`
    );
    const maxLength = 4000; // Giới hạn an toàn dưới 4096 ký tự
    let currentMessage = `Danh sách người dùng (${users.length}):\n`;
    const messages = [];

    for (const user of userList) {
        const line = `${user}\n`;
        if (currentMessage.length + line.length > maxLength) {
            messages.push(currentMessage);
            currentMessage = `Danh sách người dùng (tiếp tục):\n`;
        }
        currentMessage += line;
    }
    messages.push(currentMessage);

    for (const msg of messages) {
        await ctx.reply(msg, { reply_to_message_id: ctx.message.message_id });
        await new Promise(resolve => setTimeout(resolve, 50)); // Độ trễ 50ms
    }
});



bot.command('setright', async (ctx) => {
    const users = JSON.parse(fs.readFileSync(usersFile));
    const user = users.find(u => u.id === ctx.from.id);
    if (!user || user.right < RIGHTS.SUPERUSER) {
        return ctx.reply('Chỉ Super User được dùng lệnh này!', { reply_to_message_id: ctx.message.message_id });
    }
    const args = ctx.message.text.split(' ').slice(1);
    let targetId, right, rightName;

    if (ctx.message.reply_to_message) {
        // Reply mode
        if (args.length !== 1) {
            return ctx.reply('Reply tin nhắn và nhập: /setright <tên quyền>\nTên quyền: superuser, advanceduser, primaryuser, none', { reply_to_message_id: ctx.message.message_id });
        }
        const repliedUser = users.find(u => u.id === ctx.message.reply_to_message.from.id);
        if (!repliedUser) {
            return ctx.reply('Người dùng reply không tồn tại trong hệ thống!', { reply_to_message_id: ctx.message.message_id });
        }
        rightName = args[0].toLowerCase();
        if (!RIGHT_NAMES[rightName]) {
            return ctx.reply('Tên quyền không hợp lệ! Chọn: superuser, advanceduser, primaryuser, none', { reply_to_message_id: ctx.message.message_id });
        }
        targetId = repliedUser.id;
        right = RIGHT_NAMES[rightName];
    } else {
        // ID mode
        if (args.length !== 2) {
            return ctx.reply('Sử dụng: /setright <user_id> <tên quyền>\nTên quyền: superuser, advanceduser, primaryuser, none', { reply_to_message_id: ctx.message.message_id });
        }
        targetId = parseInt(args[0]);
        rightName = args[1].toLowerCase();
        if (!RIGHT_NAMES[rightName]) {
            return ctx.reply('Tên quyền không hợp lệ! Chọn: superuser, advanceduser, primaryuser, none', { reply_to_message_id: ctx.message.message_id });
        }
        right = RIGHT_NAMES[rightName];
    }

    const targetUser = users.find(u => u.id === targetId);
    if (!targetUser) {
        return ctx.reply('Không tìm thấy người dùng!', { reply_to_message_id: ctx.message.message_id });
    }
    targetUser.right = right;
    fs.writeFileSync(usersFile, JSON.stringify(users));
    const rightText = right === RIGHTS.SUPERUSER ? 'Super User' : right === RIGHTS.ADVANCEDUSER ? 'Advanced User' : right === RIGHTS.PRIMARYUSER ? 'Primary User' : 'None';
    await ctx.reply(`Đã đặt quyền ${rightText} cho ID ${targetId}`, { reply_to_message_id: ctx.message.message_id });
});


// Xử lý lệnh /help
bot.command('help', async (ctx) => {
    console.log('Xử lý lệnh /help từ:', ctx.from);
    try {
        await ctx.reply('Danh sách lệnh:\n/start - Khởi động bot\n/help - Hiển thị trợ giúp');
    } catch (err) {
        console.error('Lỗi gửi phản hồi /help:', err);
    }
});

// Xử lý tin nhắn văn bản
bot.on('text', async (ctx) => {
    console.log('Nhận tin nhắn:', ctx.message.text);
    try {
        // await ctx.reply(`Bạn đã gửi: ${ctx.message.text}`);
    } catch (err) {
        console.error('Lỗi gửi phản hồi text:', err);
    }
});

// Xử lý lỗi toàn cục
bot.catch((err, ctx) => {
    console.error('Lỗi xử lý update:', err, 'Update:', ctx.update);
});

// Định nghĩa endpoint webhook
const webhookPath = '/webhook';
app.post(webhookPath, (req, res) => {
    console.log('Nhận webhook request:', req.body);
    try {
        bot.handleUpdate(req.body, res); // Xử lý update từ Telegram
    } catch (err) {
        console.error('Lỗi xử lý webhook request:', err);
        res.status(500).send('Error processing webhook');
    }
});

// Route kiểm tra server
app.get('/', (req, res) => {
    res.send('Bot is running!');
});

// Hàm thiết lập webhook
async function setupWebhook() {
    const certificatePath = '/etc/ssl/self-signed/server.crt';
    const webhookUrl = `https://${WEBHOOK_IP}${webhookPath}`;

    // Kiểm tra file chứng chỉ
    try {
        if (!fs.existsSync(certificatePath)) {
            throw new Error(`File chứng chỉ không tồn tại: ${certificatePath}`);
        }
        const certificate = fs.readFileSync(certificatePath);
        console.log(`Đọc chứng chỉ thành công từ: ${certificatePath}`);

        // Thiết lập webhook với chứng chỉ tự ký
        await bot.telegram.setWebhook(webhookUrl, {
            certificate: { source: certificate }, // Đảm bảo gửi chứng chỉ đúng định dạng
        });
        console.log(`Webhook đã được thiết lập tại: ${webhookUrl}`);

        // Kiểm tra trạng thái webhook ngay sau khi thiết lập
        const webhookInfo = await bot.telegram.getWebhookInfo();
        console.log('Trạng thái webhook:', JSON.stringify(webhookInfo, null, 2));
    } catch (err) {
        console.error(`Lỗi thiết lập webhook: ${err.message}`);
        throw err;
    }
}

// Hàm chính để khởi động bot
async function startBot() {
    try {
        // Thiết lập webhook trước khi khởi động server
        await setupWebhook();

        // Khởi động server Express
        app.listen(PORT, () => {
            console.log(`Server chạy trên cổng ${PORT}`);
        });
    } catch (err) {
        console.error('Không thể khởi động bot:', err);
        process.exit(1);
    }
}

// Gọi hàm chính
startBot();

// Xử lý graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));