# Dự án Bot Telegram

Một bot Telegram được xây dựng bằng **Node.js** và framework **Telegraf**, hỗ trợ quản lý người dùng, phân quyền, gửi tin nhắn hàng loạt, và thiết lập quyền. Bot sử dụng **webhook** để giao tiếp với Telegram, lưu dữ liệu người dùng trong tệp JSON, và sử dụng **Nginx** làm reverse proxy để chuyển tiếp yêu cầu từ cổng 443 (HTTPS) sang cổng 3000 của server Express. Ở trong code hiện tại ta sẽ sử dụng port 443 để chạy BOT luôn nhé!

## 📋 Tính năng

- **Quản lý người dùng**: Lưu thông tin người dùng (ID, tên, username, chat ID, quyền) trong tệp `users.json`.
- **Phân quyền**: Hỗ trợ các cấp quyền:
  - *Super User* (9)
  - *Advanced User* (4)
  - *Primary User* (2)
  - *None* (0)
- **Lệnh chính**:
  - `/start`: Đăng ký người dùng mới và khởi động bot.
  - `/help`: Hiển thị danh sách lệnh.
  - `/broadcast <tin nhắn>`: Gửi tin nhắn hàng loạt tới tất cả người dùng (*chỉ Super User*).
  - `/listusers`: Liệt kê thông tin tất cả người dùng (*chỉ Super User*).
  - `/setright <user_id> <tên quyền>` hoặc reply với `/setright <tên quyền>`: Thiết lập quyền cho người dùng (*chỉ Super User*).
- **Webhook**: Sử dụng webhook với chứng chỉ SSL tự ký để nhận cập nhật từ Telegram.
- **Reverse Proxy**: Sử dụng Nginx để chuyển tiếp yêu cầu từ cổng 443 sang cổng 3000.
- **Logging**: Ghi log chi tiết các cập nhật và lỗi.

## 🔧 Yêu cầu

- **Node.js**: Phiên bản 16.x hoặc cao hơn.
- **npm**: Quản lý gói đi kèm với Node.js.
- **Tài khoản Telegram**: Lấy `BOT_TOKEN` từ [BotFather](https://t.me/BotFather).
- **Máy chủ với IP công khai**: Để thiết lập webhook.
- **Chứng chỉ SSL tự ký**: Để hỗ trợ HTTPS cho webhook.
- **Nginx**: Để cấu hình reverse proxy.

## 🚀 Hướng dẫn cài đặt

### 1. Tải mã nguồn

Clone repository từ GitHub:

```bash
git clone https://github.com/RoSino18k/telegram-bot.git
cd <repository-name>
```

### 2. Cài đặt gói phụ thuộc

Cài đặt các gói Node.js cần thiết:

```bash
npm install
```

Các gói bao gồm:
- `telegraf`: Framework xây dựng bot Telegram.
- `express`: Xử lý webhook và tạo server.
- `fs`: Làm việc với hệ thống tệp.
- `dotenv`: Quản lý biến môi trường.

### 3. Cấu hình biến môi trường

Tạo tệp `.env` trong thư mục gốc với nội dung:

```bash
BOT_TOKEN=<your_bot_token>
WEBHOOK_IP=<your_server_public_ip>
PORT=443
```

- `BOT_TOKEN`: Lấy từ BotFather.
- `WEBHOOK_IP`: IP công khai của máy chủ.
- `PORT`: Cổng server Express (mặc định: 443).

### 4. Tạo chứng chỉ SSL tự ký

Webhook Telegram yêu cầu HTTPS, do đó cần tạo chứng chỉ SSL:

```bash
mkdir -p /etc/ssl/self-signed
openssl req -x509 -newkey rsa:2048 -keyout /etc/ssl/self-signed/server.key -out /etc/ssl/self-signed/server.crt -days 365 -nodes
```

- Đảm bảo đường dẫn `/etc/ssl/self-signed/server.crt` và `/etc/ssl/self-signed/server.key` khớp với mã nguồn.
- Nếu sử dụng đường dẫn khác, cập nhật biến `certificatePath` trong `bot.js`.

### 5. Cài đặt và cấu hình Nginx

**Mục đích của Nginx**:
- Đáp ứng yêu cầu HTTPS của Telegram cho webhook (Telegram chỉ chấp nhận kết nối qua cổng 443).
- Chuyển tiếp lưu lượng từ cổng 443 (HTTPS) sang cổng 3000 (server Express).
- Đảm bảo bảo mật và quản lý lưu lượng mạng hiệu quả.

Cài đặt Nginx:

```bash
sudo apt update
sudo apt install nginx
```

Tạo tệp cấu hình Nginx:

```bash
sudo nano /etc/nginx/sites-available/telegram-bot
```

Thêm nội dung sau, thay `<your_server_public_ip>` bằng IP công khai của bạn:

```nginx
server {
    listen 443 ssl;
    server_name <your_server_public_ip>;

    ssl_certificate /etc/ssl/self-signed/server.crt;
    ssl_certificate_key /etc/ssl/self-signed/server.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /webhook {
        proxy_pass http://localhost:3000/webhook;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Kích hoạt cấu hình:

```bash
sudo ln -s /etc/nginx/sites-available/telegram-bot /etc/nginx/sites-enabled/
```

Kiểm tra và khởi động lại Nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

- Đảm bảo cổng 443 được mở: `sudo ufw allow 443`.
- Nginx sẽ chuyển tiếp yêu cầu từ `https://<your_server_public_ip>/webhook` đến `http://localhost:3000/webhook`.

### 6. Chạy bot

Khởi động bot:

```bash
node bot.js
```

- Bot sẽ thiết lập webhook qua Nginx và chạy server Express trên cổng 3000.
- Kiểm tra log trong terminal để xác nhận webhook hoạt động.

### 7. Kiểm tra trạng thái

Truy cập `https://<your_server_public_ip>/`:
- Nếu thấy "Bot is running!", server đã hoạt động.
- Thử các lệnh như `/start`, `/help` trên Telegram.

## 🛠️ Cách sử dụng

1. **Khởi động bot**:
   - Gửi `/start` để đăng ký người dùng mới.
2. **Xem lệnh**:
   - Gửi `/help` để xem danh sách lệnh.
3. **Quản lý quyền** (*Super User*):
   - Gửi `/setright <user_id> <tên quyền>` (ví dụ: `/setright 123456789 superuser`).
   - Hoặc reply tin nhắn và gửi `/setright <tên quyền>` (ví dụ: `/setright superuser`).
4. **Gửi tin nhắn hàng loạt** (*Super User*):
   - Gửi `/broadcast <tin nhắn>` để gửi đến tất cả người dùng.
5. **Xem danh sách người dùng** (*Super User*):
   - Gửi `/listusers` để xem thông tin người dùng.

## ⚠️ Lưu ý

- **Quyền Super User**: Để dùng các lệnh quản trị (`/broadcast`, `/listusers`, `/setright`), chỉnh sửa `users.json` để đặt `right: 9` cho ID của bạn.
- **Giới hạn tin nhắn**: `/listusers` chia danh sách thành nhiều tin nhắn nếu vượt 4000 ký tự.
- **Độ trễ**: `/broadcast` và `/listusers` có độ trễ 50ms để tránh vượt giới hạn API Telegram.
- **Webhook**: Nếu không hoạt động, kiểm tra:
  - Chứng chỉ SSL có hợp lệ và đúng đường dẫn không.
  - Cổng 443 và 3000 có mở không.
  - `WEBHOOK_IP` trong `.env` có khớp với `server_name` trong Nginx không.
- **Nginx**: Kiểm tra log nếu có lỗi:
  ```bash
  sudo tail -f /var/log/nginx/error.log
  ```

## 🔍 Xử lý sự cố

- **Lỗi "Thiếu BOT_TOKEN hoặc WEBHOOK_IP"**: Kiểm tra tệp `.env`.
- **Lỗi "File chứng chỉ không tồn tại"**: Xác nhận đường dẫn `/etc/ssl/self-signed/server.crt` trong `bot.js`.
- **Bot không phản hồi**: Kiểm tra log terminal và Nginx (`/var/log/nginx/error.log`).
- **Gửi tin nhắn thất bại**: Đảm bảo bot không bị chặn bởi Telegram (giới hạn API).
- **Lỗi Nginx**: Chạy `sudo nginx -t` để kiểm tra cấu hình.

## 🤝 Đóng góp

1. Fork repository.
2. Tạo nhánh: `git checkout -b feature/ten-tinh-nang`.
3. Commit thay đổi: `git commit -m 'Thêm tính năng XYZ'`.
4. Push nhánh: `git push origin feature/ten-tinh-nang`.
5. Tạo Pull Request trên GitHub.

## 📜 Giấy phép

Dự án được cấp phép dưới [MIT License](LICENSE).

## 📬 Liên hệ

- **Tác giả**: @RoSino18k
- **Năm**: 2025
- **Hỗ trợ**: Liên hệ qua Telegram hoặc mở issue trên GitHub.
