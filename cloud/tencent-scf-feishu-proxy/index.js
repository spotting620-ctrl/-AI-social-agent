/**
 * 腾讯云函数（Node.js）HTTP 触发：把问卷 JSON 原样转发到飞书自定义机器人 Webhook。
 *
 * 环境变量（在函数「配置」里添加）：
 *   FEISHU_WEBHOOK  必填，例如 https://open.feishu.cn/open-apis/bot/v2/hook/xxxx
 *   FEISHU_SIGN_SECRET  若机器人在飞书里开启了「签名校验」，必填：机器人详情里复制的签名密钥（不是 Webhook）。
 *                       未开启签名校验时可不填。
 *
 * 入口必须与控制台「执行方法」一致：代码为 exports.main 时，执行方法填 index.main。
 * （旧版「API 网关触发器」已对新用户下线，若提示不支持 API 触发，请改用函数 URL。）
 */
"use strict";

const crypto = require("crypto");
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

/** 飞书常返回 HTTP 200 + JSON，用 code / StatusCode 表示是否真正发进群里 */
function feishuBizOk(httpStatus, responseBody) {
  if (httpStatus < 200 || httpStatus >= 300) {
    return { ok: false, detail: responseBody || "bad http" };
  }
  let j = null;
  try {
    j = JSON.parse(responseBody);
  } catch {
    return { ok: true };
  }
  if (typeof j.code === "number" && j.code !== 0) {
    return {
      ok: false,
      detail: JSON.stringify({
        code: j.code,
        msg: j.msg || j.StatusMessage || "",
      }),
    };
  }
  if (typeof j.StatusCode === "number" && j.StatusCode !== 0) {
    return {
      ok: false,
      detail: JSON.stringify({
        StatusCode: j.StatusCode,
        StatusMessage: j.StatusMessage || "",
      }),
    };
  }
  return { ok: true };
}

/**
 * 飞书自定义机器人「签名校验」算法（与官方文档一致）：
 * stringToSign = timestamp + "\n" + secret ，以此作为 HmacSHA256 的 key，对空串做 HMAC，再 Base64。
 * 时间戳为秒级，与当前时间相差不超过 1 小时。
 */
function feishuSign(secret, timestampSec) {
  const stringToSign = `${timestampSec}\n${secret}`;
  return crypto
    .createHmac("sha256", Buffer.from(stringToSign, "utf8"))
    .update(Buffer.alloc(0))
    .digest("base64");
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
    const signSecret = (process.env.FEISHU_SIGN_SECRET || "").trim();
    let outbound = forwardBody;
    if (signSecret) {
      const obj = JSON.parse(forwardBody);
      const ts = Math.floor(Date.now() / 1000);
      obj.timestamp = String(ts);
      obj.sign = feishuSign(signSecret, ts);
      outbound = JSON.stringify(obj);
    }

    const r = await sendHttpsJson(hook, outbound);
    const biz = feishuBizOk(r.statusCode, r.body);
    if (!biz.ok) {
      return {
        isBase64Encoded: false,
        statusCode: 502,
        headers: cors,
        body: JSON.stringify({
          error: "feishu rejected",
          detail: biz.detail,
          raw: (r.body || "").slice(0, 800),
        }),
      };
    }
    return {
      isBase64Encoded: false,
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ ok: true, feishu: (r.body || "").slice(0, 300) }),
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
