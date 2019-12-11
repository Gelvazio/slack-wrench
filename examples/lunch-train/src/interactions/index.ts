import { App } from '@slack/bolt';

import lunchTrain from './lunch-train';

export default function attach(app: App) {
  lunchTrain(app);
}
