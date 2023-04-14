import { apolloClient } from './utils/apollo-client';
import { FollowingDocument, FollowingRequest } from './utils/graphql/generated';
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  data: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  const { method } = req;
  switch (method) {
    case 'GET':
      getFollowing(req, res);
      break;
    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

const getFollowingRequest = async (request: FollowingRequest) => {
  const result = await apolloClient.query({
    query: FollowingDocument,
    variables: {
      request,
    },
  });

  return result.data.following;
};

const getFollowing = async (
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) => {
  const { walletAddress } = req.query;
  const result = await getFollowingRequest({
    address: walletAddress,
  });
  console.log('following: result', result);

  res.status(200).json({ data: result });

  return;
};
