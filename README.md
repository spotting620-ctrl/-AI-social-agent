# 社交 AI 问卷（静态页）

面向**国内被试**：网页放在**国内云静态托管**，提交走**飞书群机器人**（推荐经**腾讯云函数**转发，避免浏览器跨域）。备选：Formspree、Gitee Pages。

---

## 一、腾讯云 COS 静态网站（推荐发链接）

概要：对象存储里打开「静态网站」，上传 `index.html`，用默认域名或绑定自有域名访问。

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/) → **对象存储 COS** → 新建存储桶（地域选离被试近，例如上海）。
2. 存储桶 → **基础配置** → **静态网站** → 开启；索引文档填 **`index.html`**，错误文档可同样填 `index.html`（单页问卷无路由时够用）。
3. **权限管理** → 存储桶访问权限：对「匿名用户」或「所有用户」开放**公有读**（仅读对象；具体以控制台文案为准），或通过 **存储桶策略** 允许 `GetObject`。
4. 本地上传：在桶内根目录上传本仓库的 **`index.html`**（可先填好下文中的 `CN_SUBMIT_PROXY_URL` 再上传）。
5. 在「静态网站」页复制 **网站访问节点** 或 **默认加速域名**，即为对外链接（若使用默认域名，注意是否为 HTTP/HTTPS 及是否需开启 **默认 CDN 加速域名** 等，以控制台说明为准）。

> **阿里云 OSS**：思路相同（静态页面托管 + 公有读 + 网站域名），可按阿里云文档操作。

---

## 二、飞书收数据（群机器人 + 云函数代理）

浏览器若**直连** `open.feishu.cn` 的 Webhook，常会遇到**跨域**导致提交失败。推荐：**问卷页 → 腾讯云函数（同地域）→ 飞书 Webhook**，Webhook 地址只放在云函数环境变量里，**不要写进 `index.html`**。

### 1. 创建飞书自定义机器人

1. 飞书群 → **设置** → **群机器人** → **添加机器人** → **自定义机器人**。
2. 复制 **Webhook 地址**（形如 `https://open.feishu.cn/open-apis/bot/v2/hook/xxxx`）。
3. 建议开启机器人的 **签名校验** 或 **关键词**（例如关键词填「问卷」），减少无关骚扰；若开启关键词，需在云函数里改文案使消息含该词（见下节可自行改 `buildFeishuMessage` 首行）。

### 2. 部署云函数（转发到飞书）

1. 打开 [云函数 SCF](https://console.cloud.tencent.com/scf) → **新建** → 运行环境 **Node.js 16+** → 空白函数。
2. 将本仓库 **`cloud/tencent-scf-feishu-proxy/index.js`** 的全部代码粘贴到函数「代码」中（入口函数名与控制台默认一致，一般为 **`main`**；若控制台要求 `exports.main` 已满足）。
3. **函数配置** → **环境变量**：新增 **`FEISHU_WEBHOOK`** = 上一步的 Webhook 完整 URL。
4. 保存并部署后，为该函数添加 **HTTP 访问服务** 或绑定 **API 网关**，得到以 `https://` 开头的**触发 URL**（注意公网可访问）。
5. 打开 **`index.html`** 中脚本，把 **`CN_SUBMIT_PROXY_URL`** 设为该触发 URL（保留末尾无多余空格）。

### 3. 直连飞书（仅调试）

若仅在部分环境测试，可把 Webhook 填进 **`FEISHU_WEBHOOK_URL`**。正式给大量被试使用前，请优先改用 **`CN_SUBMIT_PROXY_URL`**。

---

## 三、`index.html` 里要填的常量（小结）

| 变量 | 作用 |
|------|------|
| **`CN_SUBMIT_PROXY_URL`** | 云函数 / API 网关 HTTPS 地址（**推荐**，国内访问） |
| **`FEISHU_WEBHOOK_URL`** | 可选，直连飞书（易跨域，仅调试用） |
| **`FORMSPREE_ID`** | 可选，Formspree 备份（境外服务） |

三者都留空时，提交会退化为「复制 JSON 到剪贴板」，**不适合正式施测**。

提交顺序：先云函数 → 再直连飞书 → 再 Formspree → 最后剪贴板。

---

## 四、受访者在中国内地、不能翻墙时

- **发链接**：优先使用 **COS / OSS 静态网站域名**（见第一节），不要用 `github.io` 作为主链接。
- **镜像备份**：仍可将代码放在 GitHub，并用 [Gitee](https://gitee.com) 导入仓库开 **Gitee Pages** 作为备用链接（见历史提交说明或自行检索「Gitee Pages」）。

---

## 五、本地同步到 GitHub

```bash
./scripts/sync-to-github.sh
```

（若已安装 `post-commit` 钩子，每次 `git commit` 后会自动 `git push`。）

COS 上的 `index.html` 需在每次修改后**重新上传**（或配合 CI/CD，本仓库未内置）。

---

## 六、Formspree（备选）

注册 [formspree.io](https://formspree.io) → 新建表单 → 将表单 ID 填入 **`FORMSPREE_ID`**。国内网络可能不稳定，适合与飞书通道并存作备份。
