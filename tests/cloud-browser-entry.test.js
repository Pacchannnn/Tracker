import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareQaEntry} from '../cloud/tests/prepare-sync-browser.js';
test('synthetic QA entry intercepts current version before any app module or Auth can run',()=>{
 const html='<script type="module" src="js/app.js?v=43"></script>';
 const entry=prepareQaEntry(html);assert.equal(entry.html,'<script type="module" src="qa.js"></script>');assert.equal(entry.appSpecifier,'./js/app.js?v=43');
});
test('unknown or duplicate app entry fails closed instead of serving enabled config without mocks',()=>{
 for(const html of ['', '<script src="other.js"></script>','<script src="js/app.js?v=43"></script><script src="js/app.js?v=44"></script>','<script src="js/app.js"></script>'])assert.throws(()=>prepareQaEntry(html),/unrecognized_qa_entry/);
});
