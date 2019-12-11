import { WebClient } from '@slack/web-api';
import ngrok from 'ngrok';
import waitPort from 'wait-port';

(async (): Promise<void> => {
  const port = 8888;
  const sessionToken = process.env.SLACK_SESSION_TOKEN;
  const appId = process.env.SLACK_DEV_APP_ID;
  const commandId = process.env.SLACK_DEV_COMMAND_ID;

  const slack = new WebClient(sessionToken);
  await waitPort({ port });
  const ngrokUrl = await ngrok.connect(port);
  const eventsCallback = `${ngrokUrl}/slack/events`;

  console.log('Started ngrok at: ', ngrokUrl);

  await slack.apiCall('developer.apps.events.subscriptions.verifyURL', {
    app: appId,
    url: eventsCallback,
  });

  console.log('Verified ngrok endpoint');

  // Update events callback and scopes
  await slack.apiCall('developer.apps.events.subscriptions.updateSubs', {
    app: appId,
    app_event_types: ['message.im'],
    bot_event_types: ['message.channels'],
    enable: true,
    filter_teams: [],
    url: eventsCallback,
  });

  // Update interactive component callback
  await slack.apiCall('developer.apps.actions.update', {
    app: appId,
    action_url: eventsCallback,
    actions: [],
  });

  await slack.apiCall('developer.apps.commands.edit', {
    app: appId,
    command: commandId,
    desc: 'Dev - Lunchtrain',
    name: 'lunchtrain',
    parse_full: 'on',
    url: eventsCallback,
    usage: '[comma, separated, terms]',
  });

  console.log('Receiving Slack events at: ', eventsCallback);
  console.log('Incoming event inspector: http://localhost:4040/');
})().catch(console.error);
