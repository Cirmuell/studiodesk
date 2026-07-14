import sharp from 'sharp';
const meta = await sharp('public/splash.gif', { animated: true }).metadata();
const total = meta.delay ? meta.delay.reduce((a, b) => a + b, 0) : 0;
console.log('frames:', meta.pages);
console.log('total duration ms:', total);
console.log('loop:', meta.loop);
