import { interactionFlow } from '@slack-wrench/bolt-interactions';
import { BlockButtonAction, SlackCommandMiddlewareArgs } from '@slack/bolt';

import PassengerBoarded from './blocks/passenger-boarded';
import StartTrain from './blocks/start-train';

interface TrainUser {
  id: string;
  ts?: string;
  channel?: string;
}

export interface LunchTrainState {
  text: string;
  conductor: TrainUser;
  passengers: TrainUser[];
}

export default interactionFlow<LunchTrainState>('lunch-train', flow => {
  const { client } = flow;

  flow.command('/lunchtrain', async args => {
    const { ack, next, body, context } = args;
    const { setState, interactionIds } = context;

    ack();

    const state: LunchTrainState = {
      text: body.text,
      conductor: {
        id: body.user_id,
      },
      passengers: [],
    };

    await Promise.all([
      client.chat.postMessage({
        token: context.botToken,
        channel: body.channel_id,
        text: '',
        blocks: StartTrain(state, interactionIds),
      }),
      setState(state),
    ]);

    next();
  });

  flow.statefulAction<BlockButtonAction>('boardButton', async args => {
    const { ack, respond, context, next, body } = args;
    const { state, setState, interactionIds } = context;

    ack();

    const passengerAlreadyJoined = state.passengers.find(
      (passenger: TrainUser) => passenger.id === body.user.id,
    );

    const isConductor = state.conductor.id === body.user.id;

    if (isConductor || passengerAlreadyJoined) {
      respond({
        text: "Don't worry, you've already boarded the train.",
        response_type: 'ephemeral',
        replace_original: false,
      });

      return;
    }

    state.passengers.push({
      id: body.user.id,
    });

    await Promise.all(
      state.passengers.map(async (passenger: TrainUser) => {
        if (!('channel' in passenger)) {
          const im = await client.im.open({
            token: context.botToken,
            user: passenger.id,
          });

          passenger.channel = (im.channel as any).id;
        }

        const messageArgs = {
          token: context.botToken,
          channel: passenger.channel || '',
          text: '',
          blocks: PassengerBoarded(state, interactionIds),
        };

        if (passenger.ts) {
          await client.chat.update({ ...messageArgs, ts: passenger.ts });
        } else {
          const message = await client.chat.postMessage(messageArgs);
          passenger.ts = message.ts as string;
        }
      }),
    );

    await Promise.all([
      respond({
        text: '',
        blocks: StartTrain(state, interactionIds),
      }),
      setState(state),
    ]);

    next();
  });

  flow.statefulAction<BlockButtonAction>('getOffTrain', async args => {
    const { ack, respond, context, next, body } = args;
    const { state, setState, interactionIds } = context;

    ack();

    const isConductor = state.conductor.id === body.user.id;
    if (isConductor) {
      respond({
        text:
          "You're the conductor of this train! You can't get off. You can cancel it in the message I DM'd you",
        response_type: 'ephemeral',
        replace_original: false,
      });

      return;
    }

    state.passengers = state.passengers.filter(
      (passenger: TrainUser) => passenger.id === body.user.id,
    );

    await setState(state);

    respond({
      text: "You're off the train",
      response_type: 'ephemeral',
      replace_original: false,
    });
  });
});
