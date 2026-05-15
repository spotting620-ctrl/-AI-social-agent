# 社交 AI 问卷（静态页）

## 别人一点链接就能打开

1. 打开 GitHub 仓库 → **Settings** → **Pages**。
2. **Build and deployment**：Source 选 **Deploy from a branch**。
3. Branch 选 **main**，文件夹选 **/ (root)** → Save。
4. 等待约 1 分钟，页面上方会出现 **Your site is live at** 开头的地址，例如：

   `https://spotting620-ctrl.github.io/-AI-social-agent/`

   把该链接发给填写者即可（具体以你仓库设置里显示的 URL 为准）。

## 填完后数据自动上传

问卷通过 [Formspree](https://formspree.io) 把每次提交发到你的邮箱（并可登录后台查看/导出）。

1. 注册 Formspree → **New Form** → 记下表单 ID（URL 里 `/f/` 后面那一段）。
2. 在本仓库打开 `index.html`，找到脚本里的 **`FORMSPREE_ID`**，改成你的 ID，例如：`const FORMSPREE_ID = "mqabcdeqr";`
3. 提交并推送到 GitHub（例如执行 `./scripts/sync-to-github.sh`），等 Pages 刷新后再发链接。

> **注意**：`FORMSPREE_ID` 留空时，页面不会向服务器上传数据（仅适合本地试填），正式发放前务必填写。

## 本地一键同步到 GitHub

```bash
./scripts/sync-to-github.sh
```

（若已安装 `post-commit` 钩子，每次 `git commit` 后也会自动 `git push`。）
