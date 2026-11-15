import assert from 'node:assert/strict';
import {renderArticleIndex} from './scripts/admin-articles.mjs';
const rows=[{slug:'amplaza-test',published:JSON.stringify({title:'아침마당 티벗 안내',description:'방송 참여'})},{slug:'sixhour-test',published:JSON.stringify({title:'6시 내고향 오늘 방송',description:'방송 정보'})},{slug:'install',published:JSON.stringify({title:'티벗 설치',description:'가입 안내'})}];
const morning=renderArticleIndex(rows,'amplaza');assert(morning.includes('아침마당 티벗 안내'));assert(!morning.includes('6시 내고향 오늘 방송'));assert(!morning.includes('티벗 설치</strong>'));
assert(renderArticleIndex(rows,'tvut').includes('티벗 설치</strong>'));assert(renderArticleIndex(rows,'sixhour').includes('6시 내고향 오늘 방송'));
assert(renderArticleIndex(rows,'whatever').includes('이 카테고리에 발행된 글이 아직 없습니다.'));
assert(renderArticleIndex([{slug:'test',published:JSON.stringify({title:'<script>alert(1)</script>',description:'<img>'})}]).includes('&lt;script&gt;'));
assert(renderArticleIndex(rows,'invalid').includes('최신 티벗·방송 정보 글'));
console.log('카테고리 분류, 빈 목록 및 HTML 이스케이프 통과');
