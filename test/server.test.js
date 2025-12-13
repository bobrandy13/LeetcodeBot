import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import {
  InteractionResponseType,
  InteractionType,
  InteractionResponseFlags,
} from 'discord-interactions';
import {
  AWW_COMMAND,
  INVITE_COMMAND,
  QUESTION_COMPLETE,
  STATS_COMMAND,
} from '../src/commands.js';
import sinon from 'sinon';
import server from '../src/server.js';
import { redditUrl } from '../src/reddit.js';

describe('Server', () => {
  describe('GET /', () => {
    it('should return a greeting message with the Discord application ID', async () => {
      const request = {
        method: 'GET',
        url: new URL('/', 'http://discordo.example'),
      };
      const env = { DISCORD_APPLICATION_ID: '123456789' };

      const response = await server.fetch(request, env);
      const body = await response.text();

      expect(body).to.equal('👋 123456789');
    });
  });

  describe('POST /', () => {
    let verifyDiscordRequestStub;

    beforeEach(() => {
      verifyDiscordRequestStub = sinon.stub(server, 'verifyDiscordRequest');
    });

    afterEach(() => {
      verifyDiscordRequestStub.restore();
    });

    it('should handle a PING interaction', async () => {
      const interaction = {
        type: InteractionType.PING,
      };

      const request = {
        method: 'POST',
        url: new URL('/', 'http://discordo.example'),
      };

      const env = {};

      verifyDiscordRequestStub.resolves({
        isValid: true,
        interaction: interaction,
      });

      const response = await server.fetch(request, env);
      const body = await response.json();
      expect(body.type).to.equal(InteractionResponseType.PONG);
    });

    it('should handle an AWW command interaction', async () => {
      const interaction = {
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: AWW_COMMAND.name,
        },
      };

      const request = {
        method: 'POST',
        url: new URL('/', 'http://discordo.example'),
      };

      const env = {};

      verifyDiscordRequestStub.resolves({
        isValid: true,
        interaction: interaction,
      });

      // mock the fetch call to reddit
      const result = sinon
        // eslint-disable-next-line no-undef
        .stub(global, 'fetch')
        .withArgs(redditUrl)
        .resolves({
          status: 200,
          ok: true,
          json: sinon.fake.resolves({ data: { children: [] } }),
        });

      const response = await server.fetch(request, env);
      const body = await response.json();
      expect(body.type).to.equal(
        InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE
      );
      expect(result.calledOnce);
    });

    it('should handle an invite command interaction', async () => {
      const interaction = {
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: INVITE_COMMAND.name,
        },
      };

      const request = {
        method: 'POST',
        url: new URL('/', 'http://discordo.example'),
      };

      const env = {
        DISCORD_APPLICATION_ID: '123456789',
      };

      verifyDiscordRequestStub.resolves({
        isValid: true,
        interaction: interaction,
      });

      const response = await server.fetch(request, env);
      const body = await response.json();
      expect(body.type).to.equal(
        InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE
      );
      expect(body.data.content).to.include(
        'https://discord.com/oauth2/authorize?client_id=123456789&scope=applications.commands'
      );
      expect(body.data.flags).to.equal(InteractionResponseFlags.EPHEMERAL);
    });

    it('should handle an unknown command interaction', async () => {
      const interaction = {
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: 'unknown',
        },
      };

      const request = {
        method: 'POST',
        url: new URL('/', 'http://discordo.example'),
      };

      verifyDiscordRequestStub.resolves({
        isValid: true,
        interaction: interaction,
      });

      const response = await server.fetch(request, {});
      const body = await response.json();
      expect(response.status).to.equal(400);
      expect(body.error).to.equal('Unknown Type');
    });
  });

  describe('All other routes', () => {
    it('should return a "Not Found" response', async () => {
      const request = {
        method: 'GET',
        url: new URL('/unknown', 'http://discordo.example'),
      };
      const response = await server.fetch(request, {});
      expect(response.status).to.equal(404);
      const body = await response.text();
      expect(body).to.equal('Not Found.');
    });
  });

  describe('Question Complete Command', () => {
    let verifyDiscordRequestStub;
    let kvMock;

    beforeEach(() => {
      verifyDiscordRequestStub = sinon.stub(server, 'verifyDiscordRequest');
      kvMock = {
        get: sinon.stub(),
        put: sinon.stub(),
      };
    });

    afterEach(() => {
      verifyDiscordRequestStub.restore();
    });

    it('should handle question completion for new user', async () => {
      const interaction = {
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: QUESTION_COMPLETE.name,
          options: [{ value: 1234 }],
        },
        user: {
          id: 'user123',
          username: 'testuser',
        },
      };

      verifyDiscordRequestStub.resolves({
        isValid: true,
        interaction,
      });

      kvMock.get.resolves(null); // New user
      kvMock.put.resolves();

      const request = {
        method: 'POST',
        url: new URL('/', 'http://discordo.example'),
        headers: {
          'x-signature-ed25519': 'signature',
          'x-signature-timestamp': 'timestamp',
        },
        text: sinon.stub().resolves(JSON.stringify(interaction)),
      };

      const env = {
        DISCORD_PUBLIC_KEY: 'public_key',
        KV: kvMock,
      };

      const response = await server.fetch(request, env);
      const body = await response.json();

      expect(response.status).to.equal(200);
      expect(body.type).to.equal(
        InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE
      );
      expect(body.data.content).to.include('Great job, testuser!');
      expect(body.data.content).to.match(/Question 1234|completed \*\*/); // Should include either fallback format or question title
      expect(body.data.content).to.include('Current streak: 1');
    });

    it('should handle duplicate question completion', async () => {
      const interaction = {
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: QUESTION_COMPLETE.name,
          options: [{ value: 1234 }],
        },
        user: {
          id: 'user123',
          username: 'testuser',
        },
      };

      verifyDiscordRequestStub.resolves({
        isValid: true,
        interaction,
      });

      const existingData = {
        username: 'testuser',
        completedQuestions: [1234],
        currentStreak: 1,
        lastCompletionDate: new Date().toDateString(),
      };

      kvMock.get.resolves(JSON.stringify(existingData));

      const request = {
        method: 'POST',
        url: new URL('/', 'http://discordo.example'),
        headers: {
          'x-signature-ed25519': 'signature',
          'x-signature-timestamp': 'timestamp',
        },
        text: sinon.stub().resolves(JSON.stringify(interaction)),
      };

      const env = {
        DISCORD_PUBLIC_KEY: 'public_key',
        KV: kvMock,
      };

      const response = await server.fetch(request, env);
      const body = await response.json();

      expect(response.status).to.equal(200);
      expect(body.data.content).to.include('already completed question 1234');
    });
  });
});
