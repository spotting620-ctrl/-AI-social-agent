# 社交 AI 问卷（静态页）

## 受访者在中国内地（不能翻墙时）

GitHub Pages 的地址在 `github.io` 上，**国内访问经常很慢或打不开**，不适合直接发给不能翻墙的被试。

更稳妥的做法是：把**同一套静态网页**发布到**国内能稳定访问**的托管上，例如下面任选其一。

### 方案 A：Gitee Pages（免费、常用）

1. 打开 [gitee.com](https://gitee.com) 注册并完成**实名认证**（发布 Pages 往往需要）。
2. 新建一个与问卷对应的仓库，把本仓库代码同步上去（任选一种）：
   - 在 Gitee 里用「**从 GitHub/GitLab 导入仓库**」导入你的 GitHub 仓库；或  
   - 本地增加 Gitee 远程后推送：  
     `git remote add gitee https://gitee.com/你的用户名/仓库名.git`  
     `git push gitee main`
3. 进入该 Gitee 仓库 → **服务** → **Gitee Pages** → 选择分支 **main**、部署目录 **/** → 更新/启动。
4. 使用 Gitee 给出的访问链接（一般为 `https://你的用户名.gitee.io/仓库名/`）发给被试。

之后你改完 `index.html`，需要**同时** `git push` 到 GitHub 和 Gitee（或只推 Gitee，以你实际发链接的站点为准），被试打开的才是最新版。

### 方案 B：国内云「静态网站托管」（更稳、略复杂）

例如**腾讯云 COS「静态网站」**、**阿里云 OSS 静态页面**等：把 `index.html` 上传到存储桶并开启静态网站、绑定域名（若用自有域名，常涉及备案）。适合已有域名或单位 IT 支持的研究项目。

### 方案 C：仅团队小范围测试

若被试都在**能访问国际网**的环境（例如海外、校园网部分出口），可继续使用下面的 **GitHub Pages**。

---

## 受访者可以访问 GitHub / 国际网络时

1. 打开 GitHub 仓库 → **Settings** → **Pages**。
2. **Build and deployment**：Source 选 **Deploy from a branch**。
3. Branch 选 **main**，文件夹选 **/ (root)** → Save。
4. 等待约 1 分钟，使用页面上 **Your site is live at** 给出的地址，例如：

   `https://spotting620-ctrl.github.io/-AI-social-agent/`

---

## 填完后数据自动上传

问卷通过 [Formspree](https://formspree.io) 把每次提交发到你的邮箱（并可登录后台查看/导出）。

1. 注册 Formspree → **New Form** → 记下表单 ID（URL 里 `/f/` 后面那一段）。
2. 在本仓库打开 `index.html`，找到脚本里的 **`FORMSPREE_ID`**，改成你的 ID，例如：`const FORMSPREE_ID = "mqabcdeqr";`
3. 保存后推送到**你实际对外发链接的那份托管**（Gitee 或 GitHub），等页面刷新。

> **注意**：`FORMSPREE_ID` 留空时，页面不会向服务器上传数据（仅适合本地试填），正式发放前务必填写。

### 内地网络说明（提交失败时看）

被试的浏览器会向 **formspree.io** 发起请求。部分内地网络下可能出现**提交慢、失败或超时**。若你或小样本试填遇到这种情况，需要改为**国内可访问的接收端**（例如：飞书多维表格 + 自动化 Webhook、腾讯云函数 + 数据库/表格等），这需要单独接接口；有需要可以再在 `index.html` 里扩展一条国内 Webhook 地址（与 Formspree 二选一或并存）。

---

## 本地一键同步到 GitHub

```bash
./scripts/sync-to-github.sh
```

（若已安装 `post-commit` 钩子，每次 `git commit` 后也会自动 `git push`。同步到 Gitee 时需在本地再执行一次 `git push gitee main`。）
