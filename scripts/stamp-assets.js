#!/usr/bin/env node
/* HTML의 로컬 css/js 주소에 ?v=<내용 해시 8자>를 붙인다.
   파일 내용이 바뀌면 해시가 바뀌어서, Pages가 10분 캐시한 예전 파일이
   새 HTML과 섞이지 않는다. --check 는 파일을 고치지 않고 어긋나면 실패한다. */
'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var root = path.join(__dirname, '..');
var check = process.argv.indexOf('--check') !== -1;
var attrRe = /\b(href|src)=(["'])([^"']+)\2/g;

function walk(dir, out) {
  fs.readdirSync(dir).forEach(function (name) {
    if (name === '.git' || name === 'node_modules') return;
    var abs = path.join(dir, name);
    var st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (name.endsWith('.html')) out.push(abs);
  });
  return out;
}

function versionOf(abs) {
  return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex').slice(0, 8);
}

function stamp(htmlPath) {
  var html = fs.readFileSync(htmlPath, 'utf8');
  var missing = [];
  var next = html.replace(attrRe, function (full, attr, quote, url) {
    var beforeHash = url.split('#')[0];
    var hash = url.slice(beforeHash.length);
    var pathOnly = beforeHash.split('?')[0];
    if (!/\.(css|js)$/i.test(pathOnly)) return full;
    if (/^(?:[a-z]+:|\/\/)/i.test(pathOnly)) return full;
    var abs = path.resolve(path.dirname(htmlPath), pathOnly);
    var rel = path.relative(root, abs);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return full;
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      missing.push(pathOnly);
      return full;
    }
    var stamped = pathOnly + '?v=' + versionOf(abs) + hash;
    return attr + '=' + quote + stamped + quote;
  });
  return { html: html, next: next, missing: missing };
}

var failed = false;
walk(root, []).sort().forEach(function (htmlPath) {
  var rel = path.relative(root, htmlPath);
  var result = stamp(htmlPath);
  if (result.missing.length) {
    failed = true;
    console.error(rel + ': 없는 파일 ' + result.missing.join(', '));
    return;
  }
  if (result.next === result.html) {
    if (!check) console.log(rel + ': 그대로');
    return;
  }
  if (check) {
    failed = true;
    console.error(rel + ': ?v= 가 파일 내용과 다릅니다. node scripts/stamp-assets.js 를 실행하세요.');
    return;
  }
  fs.writeFileSync(htmlPath, result.next);
  console.log(rel + ': 갱신');
});

if (failed) process.exit(1);
if (check) console.log('asset versions ok');
