'use client';

import { Chatbox } from '@talkjs/react-components';
import '@talkjs/react-components/default.css';
import { getTalkSession } from '@talkjs/core';
import { useEffect } from 'react';

function Chat() {
  const appId = '<APP_ID>';
  const userId = 'frank';
  const otherUserId = 'nina';
  const conversationId = 'new_conversation';
  const session = getTalkSession({
    // @ts-expect-error host property is not declared in TalkJS typings
    host: 'durhack.talkjs.com',
    appId,
    userId,
  });

  useEffect(() => {
    session.currentUser.createIfNotExists({ name: 'Frank' });
    session.user(otherUserId).createIfNotExists({ name: 'Nina' });

    const conversation = session.conversation(conversationId);
    conversation.createIfNotExists();
    conversation.participant(otherUserId).createIfNotExists();
  }, [session, conversationId, otherUserId]);

  return (
    <Chatbox
      // @ts-expect-error - host property is not included in TalkJS component typings
      host="durhack.talkjs.com"
      style={{ width: '400px', height: '600px' }}
      appId={appId}
      userId={userId}
      conversationId={conversationId}
    />
  );
}

export default Chat;