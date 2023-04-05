import {
  nowInSec,
  SkyWayAuthToken,
  SkyWayContext,
  SkyWayRoom,
  SkyWayStreamFactory,
  uuidV4,
} from '@skyway-sdk/room';

const appId = "8c9f26d4-7ef8-4734-9af5-90db71dff654";
const secret = "s0DqpzvIQPD4bgPgRrpWh25QSq0N2ZwrKMkDdrqWV5M="

const token = new SkyWayAuthToken({
  jti: uuidV4(),
  iat: nowInSec(),
  exp: nowInSec() + 60 * 60 * 24,
  scope: {
    app: {
      id: appId,
      turn: true,
      actions: ['read'],
      channels: [
        {
          id: '*',
          name: '*',
          actions: ['write'],
          members: [
            {
              id: '*',
              name: '*',
              actions: ['write'],
              publication: {
                actions: ['write'],
              },
              subscription: {
                actions: ['write'],
              },
            },
          ],
          sfuBots: [
            {
              actions: ['write'],
              forwardings: [
                {
                  actions: ['write'],
                },
              ],
            },
          ],
        },
      ],
    },
  },
}).encode(secret);

(async () => {
  const mute = document.getElementById('mute');
  const buttonArea = document.getElementById('button-area');
  const remoteMediaArea = document.getElementById('remote-media-area');
  const channelNameInput = document.getElementById(
    'channel-name'
  );
  const joinButton = document.getElementById('join');

  const audio =
    await SkyWayStreamFactory.createMicrophoneAudioStream();

  mute.onclick = () => {
    if(audio.isEnabled) {
      mute.innerText = "UnMute";
    } else {
      mute.innerText = "Mute";
    }
    audio.setEnabled(!audio.isEnabled);
  }

  joinButton.onclick = async () => {
    if (channelNameInput.value === '') return;

    const context = await SkyWayContext.Create(token);
    const channel = await SkyWayRoom.FindOrCreate(context, {
      type: 'sfu',
      name: channelNameInput.value,
    });
    const me = await channel.join();

    await me.publish(audio);

    const subscribeAndAttach = async (publication) => {
      if (publication.publisher.id === me.id) return;

      const subscribeButton = document.createElement('button');
      subscribeButton.textContent = `${publication.publisher.id}: ${publication.contentType}`;
      buttonArea.appendChild(subscribeButton);

      const { stream, subscription } = await me.subscribe(publication.id);
        switch (stream.contentType) {
          case 'audio':
            {
              const elm = document.createElement('audio');
              elm.controls = true;
              elm.autoplay = true;
              stream.attach(elm);
              remoteMediaArea.appendChild(elm);
            }
            break;
        }
    };
    channel.publications.forEach(subscribeAndAttach);
    channel.onStreamPublished.add((e) => subscribeAndAttach(e.publication));
  };
})();
