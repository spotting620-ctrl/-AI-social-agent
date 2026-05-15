/**
 * 腾讯云函数（Node.js）HTTP 触发：把问卷 JSON 原样转发到飞书自定义机器人 Webhook。
 *
 * 环境变量（在函数「配置」里添加）：
 *   FEISHU_WEBHOOK  必填，例如 https://open.feishu.cn/open-apis/bot/v2/hook/xxxx
 *
 * 入口必须与控制台「执行方法」一致：代码为 exports.main 时，执行方法填 index.main。
 * （旧版「API 网关触发器」已对新用户下线，若提示不支持 API 触发，请改用函数 URL。）
 */
"use strict";

const https = require("https");

function parseEvent(event) {
  let ev = event;
  if (typeof ev === "string") {
    try {
      ev = JSON.parse(ev);
    } catch {
      return { method: "POST", bodyRaw: "" };
    }
  }
  if (!ev || typeof ev !== "object") {
    return { method: "POST", bodyRaw: "" };
  }

  let method = "POST";
  if (typeof ev.httpMethod === "string") method = ev.httpMethod;
  else if (ev.requestContext && ev.requestContext.http && ev.requestContext.http.method)
    method = ev.requestContext.http.method;

  let bodyRaw = "";
  if (ev.body !== undefined && ev.body !== null) {
    if (typeof ev.body === "string") bodyRaw = ev.body;
    else if (typeof ev.body === "object") bodyRaw = JSON.stringify(ev.body);
  }
  if (!bodyRaw && ev.Body !== undefined && ev.Body !== null) {
    if (typeof ev.Body === "string") bodyRaw = ev.Body;
    else if (typeof ev.Body === "object") bodyRaw = JSON.stringify(ev.Body);
  }

  // 控制台「自定义测试」若直接贴飞书消息 JSON（无外层 httpMethod/body）
  if (!bodyRaw && ev.msg_type && ev.content) {
    bodyRaw = JSON.stringify({ msg_type: ev.msg_type, content: ev.content });
  }

  if (ev.isBase64Encoded && typeof bodyRaw === "string" && bodyRaw.length > 0) {
    try {
      bodyRaw = Buffer.from(bodyRaw, "base64").toString("utf8");
    } catch {
      /* keep */
    }
  }
  return { method, bodyRaw };
}

function sendHttpsJson(urlString, jsonBody) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const bodyStr = typeof jsonBody === "string" ? jsonBody : JSON.stringify(jsonBody);
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": Buffer.byteLength(bodyStr, "utf8"),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks).toString("utf8");
          resolve({ statusCode: res.statusCode || 0, body: buf });
        });
      }
    );
    req.on("error", reject);
    req.write(bodyStr, "utf8");
    req.end();
  });
}

exports.main = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS,GET",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const { method, bodyRaw } = parseEvent(event);

  if (method === "OPTIONS") {
    return { isBase64Encoded: false, statusCode: 204, headers: cors, body: "" };
  }

  const hook = process.env.FEISHU_WEBHOOK || "";
  if (!hook) {
    return {
      isBase64Encoded: false,
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: "missing FEISHU_WEBHOOK env" }),
    };
  }

  let forwardBody = bodyRaw;
  if (!forwardBody || typeof forwardBody !== "string") {
    return {
      isBase64Encoded: false,
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({ error: "empty body" }),
    };
  }

  try {
    JSON.parse(forwardBody);
  } catch {
    return {
      isBase64Encoded: false,
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({ error: "body must be JSON" }),
    };
  }

  try {
    const r = await sendHttpsJson(hook, forwardBody);
    if (r.statusCode < 200 || r.statusCode >= 300) {
      return {
        isBase64Encoded: false,
        statusCode: 502,
        headers: cors,
        body: JSON.stringify({ error: "feishu webhook error", detail: r.body.slice(0, 500) }),
      };
    }
    return {
      isBase64Encoded: false,
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ ok: true }),
    };
  } catch (e) {
    return {
      isBase64Encoded: false,
      statusCode: 502,
      headers: cors,
      body: JSON.stringify({ error: String(e && e.message ? e.message : e) }),
    };
  }
};
