import app from './app';

(async () => {
  console.log('⚡ Starting Lunch Train');
  await app.start(8888);
  console.log('⚡ Lunch train is running!');
})().catch(console.error);
