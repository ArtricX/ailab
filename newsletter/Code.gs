/**
 * 아이고 아침 메일 (Code.gs)
 *
 * 하는 일
 *  - 매일 아침 7시: 사이트에 오늘 글(PR 병합 뒤 만들어지는 content/날짜.json)이 있으면 구독자에게 메일을 보내요.
 *    글이 늦게 올라와도 낮 12시까지는 올라오는 대로 보내요. 하루에 한 번만 보내요.
 *  - 블로그 구독 칸에서 신청을 받아 '구독자' 시트에 넣고, 확인 메일 → 확인 링크를 누르면 구독이 확정돼요.
 *  - 메일 맨 아래 '그만 받기' 링크를 누르면 바로 빠져요.
 *  - 특이사항이 생기면 OWNER_EMAIL로 '[아이고 알림]' 메일을 보내요.
 *
 * 처음 한 번: setup 실행 → '배포 > 새 배포 > 웹 앱'(실행: 나, 액세스: 모든 사용자) → 웹 앱 주소를 Claude에게 알려 주기
 */

var SITE = 'https://aigo.artricx.com/';
var EMAIL_ASSETS = SITE + 'assets/email/';   // 메일 그림 (저장소 assets/email/, 사이트에 올라가야 보여요)
var HEADER_IMG = EMAIL_ASSETS + 'logo.png';    // 메일 머리 로고 (169×34로 보여 줘요, 그림은 3배 크기)
var APP_STORE_URL = 'https://apps.apple.com/kr/app/id6827768014';
var PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.artricx.aigo';
var OWNER_EMAIL = 'uxdjsa@gmail.com';   // 알림을 받을 주소
var TZ = 'Asia/Seoul';
var SEND_FROM_MIN = 7 * 60;             // 07:00부터 보내요
var LATE_ALERT_MIN = 7 * 60 + 30;       // 07:30까지 글이 없으면 알려요
var GIVE_UP_MIN = 12 * 60;              // 12:00까지 글이 없으면 오늘은 보내지 않고 알려요
var INITIAL_SUBSCRIBERS = [            // 처음 setup 때 옮겨 올 구독자 (저장소에는 주소를 넣지 않아요)
];
var SUB_SHEET = '구독자';
var LOG_SHEET = '발송 기록';
var SUB_HEAD = ['email', 'status', 'token', 'created_at', 'confirmed_at', 'unsubscribed_at', 'last_confirm_mail_at'];

// ───────── 처음 한 번 ─────────

/** ▶ 처음 한 번 실행: 시트 만들기, 구독자 4명 옮기기, 5분마다 도는 예약 걸기 */
function setup() {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(SUB_SHEET);
  var now = nowIso_();
  INITIAL_SUBSCRIBERS.forEach(function (email) {
    if (!findRow_(sh, email)) sh.appendRow([email, 'active', newToken_(), now, now, '', '']);
  });
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'tick') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(5).create();
  // 오늘 글은 사과 메일로 이미 보냈으니, 자동 발송은 내일부터 시작해요.
  var today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('sent_' + today)) props.setProperty('sent_' + today, 'setup ' + now);
  Logger.log('준비 끝. 자동 발송은 내일 아침 7시부터예요. 구독자 시트: ' + ss.getUrl());
  Logger.log('이제 배포 > 새 배포 > 웹 앱 으로 배포하고, 웹 앱 주소를 알려 주세요.');
}

// ───────── 매일 발송 ─────────

/** 5분마다 자동으로 돌아요. 직접 실행하지 않아도 돼요. */
function tick() {
  var now = new Date();
  var today = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  var mins = Number(Utilities.formatDate(now, TZ, 'H')) * 60 + Number(Utilities.formatDate(now, TZ, 'm'));
  if (mins < SEND_FROM_MIN) return;

  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('sent_' + today)) return;

  if (mins >= GIVE_UP_MIN) {
    if (!props.getProperty('gaveup_' + today)) {
      props.setProperty('gaveup_' + today, nowIso_());
      alert_('오늘 메일을 보내지 않았어요 (' + today + ')',
        '낮 12시까지 사이트에 오늘 글이 올라오지 않아서, 오늘은 메일을 보내지 않았어요.\n' +
        '오늘 PR이 병합됐는지 확인해 주세요: https://github.com/ArtricX/ailab/pulls\n' +
        '늦게라도 보내려면 앱스 스크립트에서 sendTodayNow 를 실행하세요.');
    }
    return;
  }

  var post = tryFetchJson_(SITE + 'content/' + today + '.json');
  if (!post) {
    if (mins >= LATE_ALERT_MIN && !props.getProperty('late_' + today)) {
      props.setProperty('late_' + today, nowIso_());
      alert_('7시 30분인데 오늘 글이 사이트에 없어요 (' + today + ')',
        '오늘 PR이 아직 병합되지 않았거나, 사이트 반영이 늦어지고 있어요.\n' +
        'PR 목록: https://github.com/ArtricX/ailab/pulls\n' +
        '병합하면 낮 12시 전까지는 5분 안에 자동으로 보내요.');
    }
    return;
  }
  sendPost_(post, today);
}

/** 늦게라도 오늘 글을 지금 바로 보내고 싶을 때 직접 실행 (이미 보냈으면 보내지 않아요) */
function sendTodayNow() {
  var today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  if (PropertiesService.getScriptProperties().getProperty('sent_' + today)) {
    Logger.log('오늘은 이미 보냈어요.');
    return;
  }
  var post = tryFetchJson_(SITE + 'content/' + today + '.json');
  if (!post) throw new Error('사이트에 오늘 글(' + today + ')이 아직 없어요.');
  sendPost_(post, today);
}

function sendPost_(post, today) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('sent_' + today)) return;

    var warnings = checkPost_(post);
    var subs = activeSubscribers_();
    var quota = MailApp.getRemainingDailyQuota();
    if (quota < subs.length) {
      warnings.push('오늘 보낼 수 있는 메일이 ' + quota + '통 남아 ' + (subs.length - quota) + '명에게는 못 보냈어요(일반 Gmail은 하루 100명).');
      subs = subs.slice(0, quota);
    }

    // 중간에 멈춰도 두 번 보내지 않도록 먼저 표시해요.
    props.setProperty('sent_' + today, nowIso_());

    var base = buildMail_(post);
    var fails = [];
    subs.forEach(function (s) {
      try {
        var mail = buildMail_(post, { unsubscribeUrl: unsubscribeUrl_(s.token) });
        GmailApp.sendEmail(s.email, mail.subject, mail.text, { htmlBody: mail.html, name: '아이고' });
      } catch (e) {
        fails.push(s.email + ': ' + e.message);
      }
    });

    getSpreadsheet_().getSheetByName(LOG_SHEET)
      .appendRow([today, nowIso_(), subs.length - fails.length, fails.length, base.subject, warnings.join(' / ')]);

    if (fails.length || warnings.length) {
      alert_('오늘 메일 발송에 확인할 일이 있어요 (' + today + ')',
        '보낸 메일: ' + (subs.length - fails.length) + '통\n' +
        (fails.length ? '\n보내지 못한 주소:\n- ' + fails.join('\n- ') + '\n' : '') +
        (warnings.length ? '\n확인할 점:\n- ' + warnings.join('\n- ') + '\n' : '') +
        '\n발송 기록: ' + getSpreadsheet_().getUrl());
    }
  } catch (e) {
    alert_('오늘 메일 발송 중 오류가 났어요 (' + today + ')', e.message + '\n\n' + (e.stack || ''));
    throw e;
  } finally {
    lock.releaseLock();
  }
}

function checkPost_(post) {
  var w = [];
  var stories = post.stories || [];
  if (stories.length !== 3) w.push('소식이 ' + stories.length + '개예요(보통 3개).');
  stories.forEach(function (s) {
    if (!s.illustration || !s.illustration.url) w.push('"' + (s.title && s.title.text) + '" 소식에 그림이 없어요.');
  });
  return w;
}

// ───────── 구독 신청 · 확인 · 그만 받기 (웹 앱) ─────────

/** 블로그 구독 칸에서 보내는 신청 */
function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p.a === 'confirm' || p.a === 'unsubscribe') return json_(handleToken_(p.a, String(p.t || '')));
  if (p.website) return json_({ ok: true, state: 'pending' });          // 자동 프로그램이 채우는 숨은 칸
  var email = String(p.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return json_({ ok: false, error: 'invalid' });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = getSpreadsheet_().getSheetByName(SUB_SHEET);
    var row = findRow_(sh, email);
    var now = nowIso_();
    if (row && row.status === 'active') return json_({ ok: true, state: 'active' });
    if (row && row.last_confirm_mail_at && (Date.now() - Date.parse(row.last_confirm_mail_at)) < 10 * 60 * 1000) {
      return json_({ ok: true, state: 'pending' });                       // 10분 안에 또 신청하면 확인 메일을 다시 보내지 않아요
    }
    var token = row ? row.token : newToken_();
    if (row) {
      sh.getRange(row.index, 2).setValue('pending');
      sh.getRange(row.index, 6).setValue('');
      sh.getRange(row.index, 7).setValue(now);
    } else {
      sh.appendRow([email, 'pending', token, now, '', '', now]);
    }
    sendConfirmMail_(email, token);
    return json_({ ok: true, state: 'pending' });
  } finally {
    lock.releaseLock();
  }
}

/** 확인·그만 받기 처리 (블로그 구독 페이지가 부르는 곳). 결과: { ok, state } */
function handleToken_(action, token) {
  if (!token) return { ok: false, error: 'notfound' };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = getSpreadsheet_().getSheetByName(SUB_SHEET);
    var row = findRowByToken_(sh, token);
    if (!row) return { ok: false, error: 'notfound' };
    if (action === 'confirm') {
      if (row.status !== 'active') {
        sh.getRange(row.index, 2).setValue('active');
        sh.getRange(row.index, 5).setValue(nowIso_());
        sh.getRange(row.index, 6).setValue('');
        alert_('새 구독자가 생겼어요', row.email + ' 님이 구독을 확인했어요.');
      }
      return { ok: true, state: 'active', email: maskEmail_(row.email) };
    }
    if (row.status !== 'unsubscribed') {
      sh.getRange(row.index, 2).setValue('unsubscribed');
      sh.getRange(row.index, 6).setValue(nowIso_());
    }
    return { ok: true, state: 'unsubscribed' };
  } finally {
    lock.releaseLock();
  }
}

/** 예전 메일 속 링크(웹 앱 주소로 바로 연결)를 위한 화면 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.a === 'confirm' || p.a === 'unsubscribe') {
    var r = handleToken_(p.a, String(p.t || ''));
    if (!r.ok) return page_('링크를 확인할 수 없어요', '링크가 잘못되었거나 오래되었어요. 블로그에서 다시 신청해 주세요.');
    if (r.state === 'active') return page_('구독이 확인됐어요', '내일 아침 7시부터 오늘의 AI 소식 세 가지를 보내 드릴게요.');
    return page_('구독을 그만두었어요', '이제 메일을 보내지 않아요. 그동안 읽어 주셔서 고마워요. 다시 받고 싶으면 블로그에서 언제든 신청해 주세요.');
  }
  return page_('아이고', '오늘의 AI 소식은 블로그에서 볼 수 있어요.');
}

function sendConfirmMail_(email, token) {
  var url = SITE + 'subscribe.html?a=confirm&t=' + encodeURIComponent(token);
  var html = '<div style="max-width:552px;margin:0 auto;padding:20px 20px 40px;' + MAIL_FONT + 'color:' + INK + ';word-break:keep-all;">' +
    '<img src="' + HEADER_IMG + '" alt="아이고 AI-go" width="169" height="34" style="display:block;width:169px;height:34px;border:0;">' +
    '<div style="height:1px;line-height:1px;font-size:0;background:' + LINE + ';margin:16px 0 0;">&nbsp;</div>' +
    '<p style="font-size:26px;line-height:1.3;font-weight:800;margin:28px 0 10px;">구독을 확인해 주세요</p>' +
    '<p style="font-size:17px;line-height:1.7;margin:0 0 24px;">아이고 아침 소식을 신청해 주셔서 고마워요. 아래 버튼을 누르면 구독이 확정되고, 매일 아침 7시에 AI 소식 세 가지를 보내 드려요.</p>' +
    '<a href="' + url + '" style="display:block;background:' + INK + ';color:#ffffff;text-decoration:none;font-size:17px;line-height:20px;font-weight:700;text-align:center;padding:16px 20px;border-radius:14px;">구독 확인하기</a>' +
    '<p style="font-size:13px;line-height:1.7;color:' + SUB + ';margin:24px 0 0;">직접 신청하지 않으셨다면 이 메일은 그냥 지우셔도 돼요. 버튼을 누르지 않으면 메일을 보내지 않아요.</p></div>';
  GmailApp.sendEmail(email, '[아이고] 구독을 확인해 주세요', '아래 주소를 열면 구독이 확정돼요.\n' + url, { htmlBody: html, name: '아이고' });
}

// ───────── 테스트 ─────────

/** 가장 최근 글을 내 메일로만 한 통 */
function sendTestToMe() {
  var index = fetchJson_(SITE + 'content/index.json');
  var post = fetchJson_(SITE + index.posts[0].file);
  var me = Session.getEffectiveUser().getEmail();
  var mail = buildMail_(post, { unsubscribeUrl: '#' });
  GmailApp.sendEmail(me, '[테스트] ' + mail.subject, mail.text, { htmlBody: mail.html, name: '아이고' });
  Logger.log('보냈어요: ' + me + ' / ' + post.date + ' / ' + mail.subject);
}

// ───────── 도우미 ─────────

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('sheet_id');
  var ss = id ? SpreadsheetApp.openById(id) : null;
  if (!ss) {
    ss = SpreadsheetApp.create('아이고 구독자');
    props.setProperty('sheet_id', ss.getId());
  }
  if (!ss.getSheetByName(SUB_SHEET)) {
    var first = ss.getSheets()[0];
    if (first && first.getLastRow() === 0 && first.getName() !== LOG_SHEET) first.setName(SUB_SHEET); else ss.insertSheet(SUB_SHEET);
    var sh = ss.getSheetByName(SUB_SHEET);
    sh.appendRow(SUB_HEAD);
    sh.setFrozenRows(1);
  }
  if (!ss.getSheetByName(LOG_SHEET)) {
    var lg = ss.insertSheet(LOG_SHEET);
    lg.appendRow(['date', 'sent_at', 'sent', 'failed', 'subject', 'warnings']);
    lg.setFrozenRows(1);
  }
  return ss;
}

function readRows_(sh) {
  var values = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var v = values[i];
    out.push({ index: i + 1, email: String(v[0]).trim().toLowerCase(), status: v[1], token: String(v[2]),
      last_confirm_mail_at: v[6] ? String(v[6]) : '' });
  }
  return out;
}
function findRow_(sh, email) {
  email = String(email).trim().toLowerCase();
  return readRows_(sh).filter(function (r) { return r.email === email; })[0] || null;
}
function findRowByToken_(sh, token) {
  return readRows_(sh).filter(function (r) { return r.token && r.token === token; })[0] || null;
}
function activeSubscribers_() {
  var seen = {};
  return readRows_(getSpreadsheet_().getSheetByName(SUB_SHEET)).filter(function (r) {
    if (r.status !== 'active' || !r.email || seen[r.email]) return false;
    seen[r.email] = true;
    return true;
  });
}

// 확인·그만 받기 링크는 블로그 구독 페이지로 보내요. 페이지가 웹 앱을 대신 불러 줘서,
// 브라우저에 구글 계정이 여러 개 로그인돼 있어도 '파일을 열 수 없습니다' 화면이 뜨지 않아요.
function unsubscribeUrl_(token) {
  return SITE + 'subscribe.html?a=unsubscribe&t=' + encodeURIComponent(token);
}
// 결과 화면에 보여 줄 주소는 앞 두 글자만 남기고 가려요 (예: ab***@gmail.com)
function maskEmail_(email) {
  var at = String(email).indexOf('@');
  if (at < 1) return '';
  return email.slice(0, Math.min(2, at)) + '***' + email.slice(at);
}
function newToken_() { return Utilities.getUuid().replace(/-/g, ''); }
function nowIso_() { return new Date().toISOString(); }

function alert_(title, body) {
  MailApp.sendEmail(OWNER_EMAIL, '[아이고 알림] ' + title, body + '\n\n— 아이고 메일 스크립트');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function page_(title, msg) {
  var html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc_(title) + '</title>' +
    '<div style="max-width:520px;margin:64px auto;padding:0 20px;font-family:\'Apple SD Gothic Neo\',\'Malgun Gothic\',\'Noto Sans KR\',sans-serif;color:#111;word-break:keep-all;">' +
    '<p style="font-size:26px;font-weight:900;margin:0 0 12px;">' + esc_(title) + '</p>' +
    '<p style="font-size:17px;line-height:1.7;margin:0 0 28px;">' + esc_(msg) + '</p>' +
    '<a href="' + SITE + '" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:999px;">아이고 블로그로 가기</a></div>';
  return HtmlService.createHtmlOutput(html).setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function fetchJson_(url) {
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('불러오지 못했어요(' + res.getResponseCode() + '): ' + url);
  return JSON.parse(res.getContentText('UTF-8'));
}
function tryFetchJson_(url) {
  var res = UrlFetchApp.fetch(url + '?v=' + Date.now(), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return null;
  try { return JSON.parse(res.getContentText('UTF-8')); } catch (e) { return null; }
}

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ───────── 메일 모양 ─────────
// 디자인: 피그마 '메일 · 뉴스레터 (휴대폰 375 / 컴퓨터 600)'. 컴퓨터 값을 기본으로 쓰고, 좁은 화면은 아래 @media로 줄여요.
// 메일 앱은 대부분 Pretendard를 불러오지 못해서 기기 기본 한글 글꼴로 보여요.

var MAIL_FONT = "font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;";
var INK = '#1B1B1F';   // 먹색 (글자, 버튼)
var SUB = '#6B6760';   // 보조 글자
var MUTED = '#8C887F'; // 흐린 글자
var LINE = '#E8E8E5';  // 구분선

// 소식 색 (색 가이드): bg·fg = 태그, tint·ink = 오늘의 말 칸
var MAIL_COLORS = {
  pink:   { bg: '#F29AA6', fg: '#1B1B1F', tint: '#FDEEF0', ink: '#B83F63' },
  yellow: { bg: '#F6C93B', fg: '#1B1B1F', tint: '#FFF7DF', ink: '#8A6400' },
  green:  { bg: '#23794B', fg: '#FFFFFF', tint: '#E8F5EE', ink: '#23794B' },
  blue:   { bg: '#2348D6', fg: '#FFFFFF', tint: '#EDF1FD', ink: '#2348D6' }
};
var MAIL_COLOR_ORDER = ['pink', 'yellow', 'green', 'blue'];
var ORDINALS = ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째'];

/** 빨강(예전 글)이나 모르는 색은 그날 쓰지 않은 색으로 바꿔요: 분홍 → 노랑 → 초록 → 파랑 순서 */
function mailColors_(names) {
  var used = {};
  names.forEach(function (c) { if (MAIL_COLORS[c]) used[c] = true; });
  return names.map(function (c) {
    if (MAIL_COLORS[c]) return MAIL_COLORS[c];
    for (var i = 0; i < MAIL_COLOR_ORDER.length; i++) {
      var k = MAIL_COLOR_ORDER[i];
      if (!used[k]) { used[k] = true; return MAIL_COLORS[k]; }
    }
    return MAIL_COLORS.pink;
  });
}

/** 구절 묶음: 구절 안에서는 줄이 바뀌지 않아요. sep을 '<br>'로 주면 구절마다 줄을 바꿔요. */
function phrases_(obj, sep) {
  var list = (obj && obj.phrases && obj.phrases.length) ? obj.phrases : [obj && obj.text || ''];
  return list.map(function (p) { return '<span style="display:inline-block;max-width:100%;">' + esc_(p) + '</span>'; }).join(sep || ' ');
}

/** 본문: 숫자·단위 묶음(nobreak)이 두 줄로 갈라지지 않게 해요 */
function bodyText_(obj) {
  var html = esc_(obj && obj.text || '');
  ((obj && obj.nobreak) || []).forEach(function (w) {
    var e = esc_(w);
    var i = html.indexOf(e);
    if (i >= 0) html = html.slice(0, i) + '<span style="white-space:nowrap;">' + e + '</span>' + html.slice(i + e.length);
  });
  return html;
}

function buildMail_(post, opts) {
  opts = opts || {};
  var stories = post.stories || [];
  var subject = opts.subject || ('[아이고] ' + stories[0].title.text + ' 오늘의 AI 소식 3가지');
  var preview = opts.preview || stories.slice(1).map(function (s) { return s.title.text; }).join(', ') + ' 소식도 있어요.';
  var dateShort = post.date.slice(5, 7).replace(/^0/, '') + '월 ' + post.date.slice(8, 10).replace(/^0/, '') + '일 ' + post.weekday + '요일';
  var minutes = post.minutes || 5;
  var storyColors = mailColors_(stories.map(function (s) { return s.color; }));
  var words = (post.words || []).slice(0, 3);
  var wordColors = mailColors_(words.map(function (w) { return w.color; }));

  var IB = 'display:inline-block;';
  var h = [];
  function row(inner, cls, style) {   // 좌우 여백(24, 휴대폰 20)이 들어간 한 줄
    h.push('<tr><td class="px' + (cls ? ' ' + cls : '') + '" style="padding:0 24px;' + (style || '') + '">' + inner + '</td></tr>');
  }
  function gap(px, cls) {             // 빈 간격
    h.push('<tr><td class="' + (cls || '') + '" style="height:' + px + 'px;line-height:' + px + 'px;font-size:0;">&nbsp;</td></tr>');
  }
  function rule() { row('<div style="height:1px;line-height:1px;font-size:0;background:' + LINE + ';">&nbsp;</div>'); }

  h.push('<!doctype html><html lang="ko"><head><meta charset="utf-8">');
  h.push('<meta name="viewport" content="width=device-width,initial-scale=1">');
  h.push('<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">');
  h.push('<title>' + esc_(subject) + '</title>');
  h.push('<style>' +
    '@media only screen and (max-width:480px){' +
    '.px{padding-left:20px !important;padding-right:20px !important;}' +
    '.top{height:20px !important;line-height:20px !important;}' +
    '.g40{height:32px !important;line-height:32px !important;}' +
    '.g32{height:24px !important;line-height:24px !important;}' +
    '.h1{font-size:28px !important;}' +
    '.st{font-size:25px !important;}' +
    '.greet{font-size:17px !important;}' +
    '}</style></head>');
  h.push('<body style="margin:0;padding:0;background:#ffffff;">');
  h.push('<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' + esc_(preview) + '</div>');
  h.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;"><tr><td align="center">');
  h.push('<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;' + MAIL_FONT + 'color:' + INK + ';word-break:keep-all;">');

  // 머리: 로고 → 구분선
  gap(20, 'top');
  row('<a href="' + SITE + '" style="text-decoration:none;"><img src="' + HEADER_IMG + '" alt="아이고 AI-go" width="169" height="34" style="display:block;width:169px;height:34px;border:0;"></a>');
  gap(16);
  rule();
  if (opts.noticeHtml) { gap(20); row(opts.noticeHtml); }
  gap(32, 'g32');

  // 날짜 → 큰 제목(구절마다 줄 바꿈) → 인사
  row('<div style="font-size:15px;line-height:20px;color:' + SUB + ';">' + esc_(dateShort) + ' 아침 · 읽는 데 약 ' + minutes + '분</div>');
  gap(12);
  row('<div class="h1" style="font-size:34px;line-height:1.28;font-weight:800;letter-spacing:-0.5px;color:' + INK + ';">' + phrases_(post.title, '<br>') + '</div>');
  gap(14);
  var greeting = opts.greeting || '좋은 아침이에요.';
  // 두 문장을 따로 묶어서, 넓은 화면은 한 줄, 좁은 화면은 '좋은 아침이에요.' 뒤에서 줄이 바뀌어요.
  row('<div class="greet" style="font-size:18px;line-height:1.5;color:' + SUB + ';">' +
    '<span style="' + IB + '">' + esc_(greeting) + '</span> ' +
    '<span style="' + IB + '">오늘의 AI 소식 세 가지를 쉽게 정리했어요.</span></div>');
  gap(40, 'g40');
  rule();

  // 소식
  stories.forEach(function (s, i) {
    var c = storyColors[i];
    var mine = (s.qa || []).filter(function (x) { return x.q === '나한테는요?'; })[0];
    gap(40, 'g40');
    if (s.illustration && s.illustration.url) {
      row('<a href="' + esc_(s.url) + '" style="text-decoration:none;"><img src="' + esc_(s.illustration.url) + '" alt="' + esc_(s.illustration.alt) + '" width="552" style="display:block;width:100%;max-width:552px;height:auto;border:0;border-radius:16px;background:' + c.tint + ';"></a>');
      gap(16);
    }
    row('<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td style="background:' + c.bg + ';border-radius:999px;padding:4px 10px;font-size:14px;line-height:17px;font-weight:700;color:' + c.fg + ';white-space:nowrap;">' + esc_(s.tag) + '</td>' +
      '<td style="padding-left:8px;font-size:14px;line-height:17px;color:' + MUTED + ';white-space:nowrap;">' + (ORDINALS[i] || (i + 1) + '번째') + ' 소식</td>' +
      '</tr></table>');
    gap(16);
    row('<div class="st" style="font-size:30px;line-height:1.35;font-weight:800;letter-spacing:-0.3px;color:' + INK + ';"><a href="' + esc_(s.url) + '" style="color:' + INK + ';text-decoration:none;">' + phrases_(s.title, '<br>') + '</a></div>');
    gap(16);
    row('<div style="font-size:17px;line-height:1.5;color:' + SUB + ';">' + phrases_(s.dek) + '</div>');
    if (mine) {
      gap(16);
      row('<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
        '<td width="28" style="width:28px;vertical-align:middle;"><img src="' + EMAIL_ASSETS + 'icon-me.png" alt="" width="28" height="28" style="display:block;width:28px;height:28px;border:0;"></td>' +
        '<td style="padding-left:8px;vertical-align:middle;font-size:19px;line-height:28px;font-weight:700;color:' + INK + ';">나한테는요?</td>' +
        '</tr></table>');
      gap(10);
      row('<div style="font-size:17px;line-height:1.75;color:' + INK + ';">' + bodyText_(mine.a) + '</div>');
    }
    gap(16);
    row('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td align="center" bgcolor="' + INK + '" style="background:' + INK + ';border-radius:14px;">' +
      '<a href="' + esc_(s.url) + '" style="display:block;padding:16px 20px;font-size:17px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;border-radius:14px;">그림과 함께 자세히 읽기</a>' +
      '</td></tr></table>');
    gap(40, i === stories.length - 1 ? '' : 'g40');
    rule();
  });

  // 오늘의 말
  if (words.length) {
    gap(32);
    row('<div style="font-size:26px;line-height:31px;font-weight:700;color:' + INK + ';">오늘의 말</div>');
    gap(16);
    row('<div style="font-size:15px;line-height:20px;color:' + SUB + ';">오늘 소식에 나온 말을 쉽게 풀었어요.</div>');
    words.forEach(function (w, i) {
      var c = wordColors[i];
      gap(i === 0 ? 16 : 12);
      row('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
        '<td bgcolor="' + c.tint + '" style="background:' + c.tint + ';border-radius:20px;padding:18px 16px 20px;">' +
        '<div style="font-size:22px;line-height:1.35;font-weight:800;color:' + c.ink + ';">' + esc_(w.word) + '</div>' +
        '<div style="padding-top:10px;font-size:16px;line-height:1.5;color:#3A3A40;">' + phrases_(w.meaning) + '</div>' +
        '</td></tr></table>');
    });
    gap(32);
  } else {
    gap(32);
  }

  // 앱 안내
  row('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td bgcolor="' + INK + '" style="background:' + INK + ';border-radius:20px;padding:24px 22px;">' +
    '<img src="' + EMAIL_ASSETS + 'app-icon.png" alt="아이고 앱 아이콘" width="56" height="56" style="display:block;width:56px;height:56px;border:0;">' +
    '<div style="padding-top:12px;font-size:22px;line-height:1.35;font-weight:800;color:#ffffff;">아이고 앱으로 받아 보세요</div>' +
    '<div style="padding-top:12px;font-size:16px;line-height:1.5;color:#D9D4CA;">매일 아침 정한 시간에 알림으로<br>' +
    '<span style="' + IB + '">알려 드려요.</span> <span style="' + IB + '">읽어도 되고, 들어도 돼요.</span></div>' +
    '<div style="padding-top:10px;font-size:0;line-height:0;">' +
    '<a href="' + APP_STORE_URL + '" style="display:inline-block;margin:8px 8px 0 0;"><img src="' + EMAIL_ASSETS + 'badge-app-store.png" alt="App Store에서 다운로드 하기" width="156" height="48" style="display:block;width:156px;height:48px;border:0;"></a>' +
    '<a href="' + PLAY_STORE_URL + '" style="display:inline-block;margin:8px 0 0 0;"><img src="' + EMAIL_ASSETS + 'badge-google-play.png" alt="Google Play에서 다운로드" width="163" height="48" style="display:block;width:163px;height:48px;border:0;"></a>' +
    '</div></td></tr></table>');
  gap(32);
  rule();
  gap(24);

  // 맺음말 · 보낸 곳 · 그만 받기
  row('<div style="font-size:16px;line-height:1.5;color:' + SUB + ';">내일 아침 7시에 또 만나요.<br>' +
    '<span style="' + IB + '">주변에 AI 소식이 궁금한 분이 있다면</span> <span style="' + IB + '">이 메일을 전달해 주세요.</span></div>');
  gap(12);
  var unsub = opts.unsubscribeUrl
    ? '<br>더 받고 싶지 않으면 <a href="' + esc_(opts.unsubscribeUrl) + '" style="color:' + SUB + ';text-decoration:underline;">그만 받기</a>'
    : '';
  row('<div style="font-size:13px;line-height:1.6;color:' + SUB + ';">아이고 AI-go · <a href="' + SITE + '" style="color:' + SUB + ';text-decoration:none;">aigo.artricx.com</a>' + unsub + '</div>');
  gap(40);
  h.push('</table></td></tr></table></body></html>');

  var text = opts.noticeText ? [opts.noticeText, ''] : [];
  text.push(greeting + ' 오늘의 AI 소식 세 가지를 쉽게 정리했어요.', dateShort + ' 아침 · 읽는 데 약 ' + minutes + '분', '');
  stories.forEach(function (s, i) {
    var mine = (s.qa || []).filter(function (x) { return x.q === '나한테는요?'; })[0];
    text.push((ORDINALS[i] || (i + 1) + '번째') + ' 소식 [' + s.tag + '] ' + s.title.text, s.dek.text);
    if (mine) text.push('나한테는요? ' + mine.a.text);
    text.push('자세히 읽기: ' + s.url, '');
  });
  if (words.length) {
    text.push('오늘의 말');
    words.forEach(function (w) { text.push('- ' + w.word + ': ' + w.meaning.text); });
    text.push('');
  }
  text.push('아이고 앱으로 받아 보세요', 'App Store: ' + APP_STORE_URL, 'Google Play: ' + PLAY_STORE_URL, '');
  text.push('내일 아침 7시에 또 만나요.', '아이고 AI-go · ' + SITE);
  if (opts.unsubscribeUrl) text.push('그만 받기: ' + opts.unsubscribeUrl);

  return { subject: subject, html: h.join('\n'), text: text.join('\n') };
}
