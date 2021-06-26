import fetch from 'node-fetch';
import { GraphQLClient, gql } from 'graphql-request';
import * as vscode from 'vscode';
import { ReplInfo } from './types';
import { renderCaptchaRefresh } from './captcha';

const gqlClient = new GraphQLClient('https://replit.com/graphql/', {});
gqlClient.setHeaders({
  'X-Requested-With': 'Replit VSCode Revived (replit/@RoBlockHead)',
  'user-agent': 'Replit VSCode Revived (replit/@RoBlockHead)',
  referrer: 'https://replit.com/@RoBlockHead',
});

// GQL query for an individual user's repls
const SelfRepls = gql`
  query SelfRepls($username: String!) {
    recentRepls(count: $num) {
      id
      user {
        username
      }
      slug
      lang {
        id
        canUseShellRunner
        engine
      }
    }
  }
`;

// GQL query to get a repl from a URL
const ReplInfoFromUrlDoc = gql`
  query ReplInfoFromUrl($url: String!) {
    repl(url: $url) {
      ... on Repl {
        id
        user {
          username
        }
        slug
        lang {
          id
          canUseShellRunner
          engine
        }
      }
    }
  }
`;

// GQL query to get a repl from a UUID
const ReplInfoFromIdDoc = gql`
  query ReplInfoFromUrl($id: String!) {
    repl(id: $id) {
      ... on Repl {
        id
        user {
          username
        }
        slug
        lang {
          id
          canUseShellRunner
          engine
        }
      }
    }
  }
`;

const ReplPerms = gql`
  query SelfInfo($replId: String!) {
    currentUser {
      id
      username
    }
    repl(id: $replId) {
      ... on Repl {
        isOwner
        multiplayers {
          id
          username
        }
      }
    }
  }
`;
// Get a user's own repls
export const getSelfRepls = async (userSid: string, count?: number): Promise<ReplInfo[]> => {
  const result = await gqlClient.request(
    SelfRepls,
    { count: count || 10 },
    {
      cookie: `connect.sid=${userSid}`,
    },
  );
  if (!result.recentRepls) {
    throw new Error(
      `Unexpected GQL Response... Expected Repls, recieved ${JSON.stringify(result)}`,
    );
  }
  const repls: ReplInfo[] = [];
  for (const repl of result.recentRepls) {
    repls.push({
      id: repl.id,
      user: repl.user.username,
      slug: repl.slug,
      lang: {
        id: repl.lang.id,
        canUseShellRunner: repl.lang.canUseShellRunner,
        engine: repl.lang.engine,
      },
    });
  }
  return repls;
};

export const canUserEditRepl = async (userSid: string, replId: string): Promise<boolean> => {
  const result = await gqlClient.request(
    ReplPerms,
    { replId },
    {
      cookie: `connect.sid=${userSid}`,
    },
  );
  if (result.repl.isOwner) {
    return true;
  };
  for (let i = 0; i < result.repl.multiplayers.length; i += 1) {
    const multiplayer = result.repl.multiplayers[i];
    if (result.currentUser.id === multiplayer.id) {
      return true;
    }
  };
  return false;
};

async function getReplInfoByUrl(url: string, userSid?: string): Promise<ReplInfo> {
  const result = await gqlClient.request(
    ReplInfoFromUrlDoc,
    { url },
    {
      cookie: `connect.sid=${userSid}`,
    },
  );

  if (!result.repl) {
    throw new Error('unexpected grqphql response for url');
  }

  return {
    id: result.repl.id,
    user: result.repl.user.username,
    slug: result.repl.slug,
    lang: {
      id: result.repl.lang.id,
      canUseShellRunner: result.repl.lang.canUseShellRunner,
      engine: result.repl.lang.engine,
    },
  };
}

async function getReplInfoById(id: string, userSid?: string): Promise<ReplInfo> {
  const result = await gqlClient.request(
    ReplInfoFromIdDoc,
    { id },
    {
      cookie: `connect.sid=${userSid}`,
    },
  );

  if (!result.repl) {
    throw new Error('unexpected grqphql response for url');
  }

  return {
    id: result.repl.id,
    user: result.repl.user.username,
    slug: result.repl.slug,
    lang: {
      id: result.repl.lang.id,
      canUseShellRunner: result.repl.lang.canUseShellRunner,
      engine: result.repl.lang.engine,
    },
  };
}

export async function getReplInfo(input: string, userSid?: string): Promise<ReplInfo> {
  if (input.split('-').length === 5) {
    return getReplInfoById(input, userSid);
  }

  // Check if user included full URL using a simple regex
  const urlRegex = /(?:http(?:s?):\/\/repl\.it\/)?@(.+)\/([^?\s#]+)/g;
  const match = urlRegex.exec(input);
  if (!match) {
    throw new Error('Please input in the format of @username/replname or full url of the repl');
  }

  const [, user, slug] = match;

  return getReplInfoByUrl(`https://replit.com/@${user}/${slug}`, userSid);
}

export async function fetchToken(
  replId: string,
  context: vscode.ExtensionContext,
): Promise<string> {
  console.log(`fetching token for ${replId}`);
  const r = await fetch(`https://replit.com/data/repls/${replId}/get_connection_metadata`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'Crosis 2: Electric Boogaloo (replit/@RoBlockHead)',
      cookie: `connect.sid=${context.secrets.get('userSid')}`,
      origin: 'https://replit.com',
      'User-Agent': 'Replit VSCode Revived (replit/@RoBlockHead)',
    },
    method: 'POST',
    body: JSON.stringify({
      captcha: context.secrets.get('captchaKey'),
      clientVersion: '7561851',
      format: 'pbuf',
      hCaptchaSiteKey: '473079ba-e99f-4e25-a635-e9b661c7dd3e',
    }),
  });
  const text = await r.text();

  if (r.status > 399) {
    if (JSON.parse(text).message?.toLowerCase().indexOf('captcha failed') !== -1) {
      if (await renderCaptchaRefresh(context)) {
        return fetchToken(replId, context);
      }
    } else {
      throw new Error(
        `Repl.it: ${r.status} Error Failed to open Repl. Error: ${JSON.parse(text).message}`,
      );
    }
  }
  console.log(`Token Obtained: ${text}`);

  let res;
  try {
    res = JSON.parse(text);
    // console.log(res.token);
  } catch (e) {
    throw new Error(`Invalid JSON while fetching token for ${replId}: ${JSON.stringify(text)}`);
  }

  return JSON.stringify(res);
}
