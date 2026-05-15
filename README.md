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

### 打开链接却变成「下载 html」怎么办？

浏览器只有在把文件当成 **网页** 时才会直接打开填写；若被当成「附件」，就会下载。请逐项检查：

1. **用对链接**  
   请使用 **静态网站** 页面提供的 **网站访问地址**（访问节点），在地址栏里应能直接打开页面。不要长期使用「对象详情里的临时链接 / 仅下载用途的链接」当作正式发放地址。

2. **改对象的 Content-Type（最常见原因）**  
   进入存储桶 → **文件列表** → 点 `index.html` → **详情 / 编辑元数据** → 将 **Content-Type** 设为 **`text/html; charset=utf-8`**（若当前是 `application/octet-stream` 等，一定要改）→ 保存。再刷新用静态网站域名访问。

3. **不要设置成「强制下载」**  
   若对象元数据里有 **Content-Disposition: attachment**，请删掉或改为 `inline`（一般默认不填即可）。

4. **路径要对**  
   索引文档填的是 `index.html` 时，文件应放在桶的**根目录**，且文件名与索引一致（区分大小写）。

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
4. 保存并部署后，为该函数开启 **「函数 URL」**（与「触发器」同级菜单，文档见[函数 URL 概述](https://cloud.tencent.com/document/product/583/96099)）：  
   - 绑定到 **`$LATEST`**（或你已发布的版本）；  
   - 鉴权选 **「开放 / 无需鉴权」**（问卷在浏览器里匿名 `POST`，需公网可调；注意勿泄露该 URL，避免被刷）。  
   - 复制形如 `https://<app-id>-<url-id>.<region>.tencentscf.com` 的 **HTTPS 地址**，填到 `index.html` 的 **`CN_SUBMIT_PROXY_URL`**。  
   - 若开启 **CORS**：`Expose-Headers`（暴露响应头）**不要留空**，否则会报 `InvalidParameterValue.Cors` / `Invalid ExposeHeaders`。可填 **`*`**，或填 **`Content-Type`** 等至少一项；`Allow-Methods` 须包含 **POST** 与 **OPTIONS**。  
   - 若浏览器提交后提示失败，用浏览器 F12 → **网络** 看对该 URL 的响应体是否含 **`handler not found`**：说明云函数 **执行方法（入口）** 与代码不一致。请打开 **函数配置** → **执行方法**，改为 **`index.main`**（表示运行 `index.js` 里的 `exports.main`），保存后**重新部署**再试。  
   - **控制台测试出现 `empty body`**：说明测试事件里没有请求体。请用 **「本地上传」/ 自定义测试事件」**，粘贴与函数 URL 一致的结构，例如：  
     `{"httpMethod":"POST","body":"{\"msg_type\":\"text\",\"content\":{\"text\":\"测试\"}}","headers":{"content-type":"application/json"}}`  
     （注意 `body` 必须是**字符串**，内部引号需转义；或只贴飞书体：`{"msg_type":"text","content":{"text":"测试"}}`，新版代理代码也支持。）  
   **说明**：控制台若提示 **「不支持 API 触发」**，是因为旧版 **「API 网关触发器」** 已对新用户逐步下线，**不是你不能用 HTTP**。请改用 **函数 URL**，不要用已下线的 API 网关触发器创建向导。
5. 打开 **`index.html`** 中脚本，把 **`CN_SUBMIT_PROXY_URL`** 设为该地址（保留末尾无多余空格），再上传 COS。

### 3. 直连飞书（仅调试）

若仅在部分环境测试，可把 Webhook 填进 **`FEISHU_WEBHOOK_URL`**。正式给大量被试使用前，请优先改用 **`CN_SUBMIT_PROXY_URL`**。

---

## 三、`index.html` 里要填的常量（小结）

| 变量 | 作用 |
|------|------|
| **`CN_SUBMIT_PROXY_URL`** | 云函数 **函数 URL** 的 HTTPS 地址（**推荐**；勿再用已下线的 API 网关触发器） |
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
