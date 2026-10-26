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

var SITE = 'https://artricx.github.io/ailab/';
var HEADER_IMG = 'https://beehiiv-images-production.s3.amazonaws.com/uploads/asset/file/3e1f0aa6-1f1d-4441-9429-6e1ef166b1d1/email-header.png?t=1791969965';
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
  var font = "font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;";
  var html = '<div style="max-width:560px;margin:0 auto;padding:24px 20px;' + font + 'color:#111111;word-break:keep-all;">' +
    '<img src="' + HEADER_IMG + '" alt="아이고" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;">' +
    '<p style="font-size:20px;font-weight:800;margin:24px 0 8px;">구독을 확인해 주세요</p>' +
    '<p style="font-size:16px;line-height:1.7;margin:0 0 20px;">아이고 아침 소식을 신청해 주셔서 고마워요. 아래 버튼을 누르면 구독이 확정되고, 매일 아침 7시에 AI 소식 세 가지를 보내 드려요.</p>' +
    '<a href="' + url + '" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 24px;border-radius:999px;">구독 확인하기</a>' +
    '<p style="font-size:13px;line-height:1.7;color:#777777;margin:24px 0 0;">직접 신청하지 않으셨다면 이 메일은 그냥 지우셔도 돼요. 버튼을 누르지 않으면 메일을 보내지 않아요.</p></div>';
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

function buildMail_(post, opts) {
  opts = opts || {};
  var stories = post.stories || [];
  var subject = opts.subject || ('[아이고] ' + stories[0].title.text + ' 오늘의 AI 소식 3가지');
  var preview = opts.preview || stories.slice(1).map(function (s) { return s.title.text; }).join(', ') + ' 소식도 있어요.';
  var dateLabel = post.date.slice(5, 7).replace(/^0/, '') + '월 ' + post.date.slice(8, 10).replace(/^0/, '') + '일 ' + post.weekday + '요일';

  var font = "font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;";
  var h = [];
  h.push('<div style="display:none;max-height:0;overflow:hidden;">' + esc_(preview) + '</div>');
  h.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td align="center">');
  h.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;' + font + 'color:#111111;word-break:keep-all;">');
  h.push('<tr><td style="padding:16px 20px 8px;"><a href="' + SITE + '"><img src="' + HEADER_IMG + '" alt="아이고" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;"></a></td></tr>');
  if (opts.noticeHtml) h.push('<tr><td style="padding:12px 20px 4px;">' + opts.noticeHtml + '</td></tr>');
  // 큰 제목: 오늘 소식 세 가지를 한 줄로 묶은 글 제목 + 부제 (구절 단위로만 줄을 바꿔요)
  var titlePhrases = (post.title.phrases && post.title.phrases.length) ? post.title.phrases : [post.title.text];
  var titleHtml = titlePhrases.map(function (p) { return '<span style="display:inline-block;max-width:100%;word-break:keep-all;">' + esc_(p) + '</span>'; }).join(' ');
  h.push('<tr><td style="padding:20px 20px 0;font-size:30px;line-height:1.3;font-weight:900;letter-spacing:-0.5px;">' + titleHtml + '</td></tr>');
  h.push('<tr><td style="padding:10px 20px 8px;font-size:15px;line-height:1.6;color:#666666;">' + esc_(dateLabel) + ' 아침, 오늘의 AI 소식 세 가지</td></tr>');
  h.push('<tr><td style="padding:8px 20px 4px;font-size:16px;line-height:1.7;">' + (opts.greeting || '좋은 아침이에요.') + ' 오늘의 AI 소식 세 가지를 쉽게 정리했어요. 읽는 데 약 ' + (post.minutes || 5) + '분이에요.</td></tr>');

  stories.forEach(function (s) {
    var mine = (s.qa || []).filter(function (x) { return x.q === '나한테는요?'; })[0];
    h.push('<tr><td style="padding:20px 20px 0;"><hr style="border:0;border-top:1px solid #dddddd;margin:0;"></td></tr>');
    if (s.illustration && s.illustration.url) {
      h.push('<tr><td style="padding:20px 20px 0;"><a href="' + esc_(s.url) + '"><img src="' + esc_(s.illustration.url) + '" alt="' + esc_(s.illustration.alt) + '" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:8px;"></a></td></tr>');
    }
    h.push('<tr><td style="padding:16px 20px 0;font-size:14px;font-weight:800;">[' + esc_(s.tag) + ']</td></tr>');
    h.push('<tr><td style="padding:6px 20px 0;font-size:22px;line-height:1.4;font-weight:800;">' + esc_(s.title.text) + '</td></tr>');
    h.push('<tr><td style="padding:8px 20px 0;font-size:16px;line-height:1.7;color:#444444;">' + esc_(s.dek.text) + '</td></tr>');
    if (mine) {
      h.push('<tr><td style="padding:12px 20px 0;font-size:16px;line-height:1.7;"><strong>나한테는요?</strong> ' + esc_(mine.a.text) + '</td></tr>');
    }
    h.push('<tr><td style="padding:16px 20px 0;"><a href="' + esc_(s.url) + '" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 20px;border-radius:999px;">그림과 함께 자세히 읽기</a></td></tr>');
  });

  var words = (post.words || []).slice(0, 3);
  if (words.length) {
    h.push('<tr><td style="padding:24px 20px 0;"><hr style="border:0;border-top:1px solid #dddddd;margin:0;"></td></tr>');
    h.push('<tr><td style="padding:20px 20px 0;font-size:18px;font-weight:800;">오늘의 말</td></tr>');
    h.push('<tr><td style="padding:8px 20px 0;font-size:16px;line-height:1.8;"><ul style="margin:0;padding-left:20px;">');
    words.forEach(function (w) { h.push('<li><strong>' + esc_(w.word) + '</strong>: ' + esc_(w.meaning.text) + '</li>'); });
    h.push('</ul></td></tr>');
  }

  var unsub = opts.unsubscribeUrl
    ? '<br>더 받고 싶지 않으면 <a href="' + esc_(opts.unsubscribeUrl) + '" style="color:#777777;">여기를 눌러 그만 받기</a>'
    : '';
  h.push('<tr><td style="padding:24px 20px 32px;font-size:16px;line-height:1.7;">내일 아침 7시에 또 만나요. 주변에 AI 소식이 궁금한 분이 있다면 이 메일을 전달해 주세요.<br><span style="font-size:13px;color:#777777;">아이고 AI-go · <a href="' + SITE + '" style="color:#777777;">' + SITE + '</a>' + unsub + '</span></td></tr>');
  h.push('</table></td></tr></table>');

  var text = opts.noticeText ? [opts.noticeText, ''] : [];
  text.push('좋은 아침이에요. ' + dateLabel + ', 오늘의 AI 소식 세 가지예요.', '');
  stories.forEach(function (s) {
    text.push('[' + s.tag + '] ' + s.title.text, s.dek.text, s.url, '');
  });
  text.push('내일 아침 7시에 또 만나요.');
  if (opts.unsubscribeUrl) text.push('그만 받기: ' + opts.unsubscribeUrl);

  return { subject: subject, html: h.join('\n'), text: text.join('\n') };
}
