'use strict';
const path=require('path'); const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});
const p=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
p.on('pageerror',e=>console.error('PAGEERROR',e.message));
await p.goto('file:///'+path.resolve(__dirname,'..','frames','styletest','blue.html').replace(/\\/g,'/'),{waitUntil:'load'});
await p.waitForTimeout(2600);
await p.locator('#view').screenshot({path:path.resolve(__dirname,'..','frames','styletest','blue.png')});
await b.close(); console.log('shot blue');})().catch(e=>{console.error('FAILED',e.message);process.exit(1);});
