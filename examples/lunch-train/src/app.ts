import { interactionFlowContext } from '@slack-wrench/bolt-interactions';
import FileStore from '@slack-wrench/bolt-storage-file';
import { App } from '@slack/bolt';

import interactions from './interactions';

const signingSecret = process.env.SLACK_SIGNING_SECRET;
const token = process.env.SLACK_BOT_TOKEN;
const store = new FileStore();
const app = new App({ convoStore: store, signingSecret, token });

app.use(interactionFlowContext(store));
interactions(app);

export default app;
