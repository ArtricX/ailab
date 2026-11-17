// 메일 미리보기: node newsletter/preview.js YYYY-MM-DD
// Code.gs의 buildMail_로 그날 메일을 만들어 preview/메일-YYYY-MM-DD.html(저장소에 올리지 않음)에 저장해요.
// 사이트 주소의 그림(assets/)은 저장소 안의 파일로 바꿔서, 병합 전에도 그림이 보여요.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const repo = path.resolve(__dirname, '..');
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
  console.error('사용법: node newsletter/preview.js YYYY-MM-DD');
  process.exit(1);
}
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(repo, 'newsletter/Code.gs'), 'utf8'), ctx);
const post = JSON.parse(fs.readFileSync(path.join(repo, 'content', date + '.json'), 'utf8'));
const mail = ctx.buildMail_(post, { unsubscribeUrl: '#' });
const html = mail.html.split(ctx.SITE + 'assets/').join('file://' + path.join(repo, 'assets') + '/');
fs.mkdirSync(path.join(repo, 'preview'), { recursive: true });
const out = path.join(repo, 'preview', '메일-' + date + '.html');
fs.writeFileSync(out, html);
console.log('제목: ' + mail.subject);
console.log('저장: ' + out + ' (' + Buffer.byteLength(mail.html) + '바이트, Gmail은 102KB가 넘으면 잘라요)');
