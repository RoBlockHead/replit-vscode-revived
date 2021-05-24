import fetch from 'node-fetch';
import { GraphQLClient, gql } from 'graphql-request';
import { ReplInfo } from './types';

const gqlClient = new GraphQLClient('https://replit.com/graphql/', {});
gqlClient.setHeaders({
  'X-Requested-With': 'Replit VSCode Revived (replit/@RoBlockHead)',
  'user-agent': 'Replit VSCode Revived (replit/@RoBlockHead)',
  referrer: 'https://replit.com/@RoBlockHead',
});

// const SelfRepls = gql`
//   query SelfRepls($username: String!) {
//     recentRepls(count: $num) {
//       id
//       user {
//         username
//       }
//       slug
//     }
//   }
// `;

const ReplInfoFromUrlDoc = gql`
  query ReplInfoFromUrl($url: String!) {
    repl(url: $url) {
      ... on Repl {
        id
        user {
          username
        }
        slug
      }
    }
  }
`;

const ReplInfoFromIdDoc = gql`
  query ReplInfoFromUrl($id: String!) {
    repl(id: $id) {
      ... on Repl {
        id
        user {
          username
        }
        slug
      }
    }
  }
`;

// const getSelfRepls = async (userSid: string, count?: number) => {
//   const result = await gqlClient.request(
//     SelfRepls,
//     { count: count || 10 },
//     {
//       cookie: `connect.sid=${userSid}`,
//     },
//   );
//   if (!result.recentRepls) {
//     throw new Error(
//       `Unexpected GQL Response... Expected Repls, recieved ${JSON.stringify(result)}`,
//     );
//   }
//   const repls = [];
//   for (const repl of result.recentRepls) {
//     repls.push({
//       id: repl.id,
//       user: repl.user.username,
//       slug: repl.slug,
//     });
//   }
//   return repls;
// };

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
  userSid: string,
  captchaKey?: string,
): Promise<string> {
  console.log(`fetching token for ${replId}`);
  const r = await fetch(`https://replit.com/data/repls/${replId}/get_connection_metadata`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'Crosis 2: Electric Boogaloo (replit/@RoBlockHead)',
      cookie: `connect.sid=${userSid}`,
      origin: 'https://replit.com',
      'User-Agent': 'Replit VSCode Revived (replit/@RoBlockHead)',
    },
    method: 'POST',
    body: JSON.stringify({
      captcha: captchaKey,
      clientVersion: '7561851',
      format: 'pbuf',
      hCaptchaSiteKey: '473079ba-e99f-4e25-a635-e9b661c7dd3e',
    }),
  });
  const text = await r.text();

  if (r.status > 399) {
    if (JSON.parse(text).message?.toLowerCase().indexOf('captcha failed') !== -1) {
      throw new Error(`Captcha failed, please set a captcha key. error: ${text}`);
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
