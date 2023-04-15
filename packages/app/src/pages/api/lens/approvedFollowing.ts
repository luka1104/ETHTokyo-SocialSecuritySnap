import { apolloClient } from './utils/apollo-client';
import { FollowingDocument, FollowingRequest } from './utils/graphql/generated';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

type Data = {
  data: any;
};

const ERC721_ABI: ethers.ContractInterface = [
    // ERC721コントラクトのABIを指定（isApprovedForAll関数の定義が必要）
    {
      "constant": true,
      "inputs": [
        { "name": "owner", "type": "address" },
        { "name": "operator", "type": "address" }
      ],
      "name": "isApprovedForAll",
      "outputs": [{ "name": "", "type": "bool" }],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }
  ];

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

  // get Apploved in Following

  res.status(200).json({ data: result });

  return;
};
