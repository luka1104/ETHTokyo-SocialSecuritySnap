import { apolloClient } from './utils/apollo-client';
import { FollowingDocument, FollowingRequest } from './utils/graphql/generated';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ethers } from 'ethers';

type Data = {
  data: any;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const { method } = req;
  switch (method) {
    case 'GET':
      getApprovedAddressList(req, res);
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

const getApprovedAddressList = async (
  req: VercelRequest,
  res: VercelResponse,
) => {
  const { walletAddress, contractAddress, operatorAddress, chainId } = req.query;
  const result = await getFollowingRequest({
    address: walletAddress,
  });
  console.log('following: result', result);

  const ownedByAddresses = result.items.map((item:any) =>  {
    return {walletAddress:item.ownedBy, handle:item.handle}
  });
  console.log(ownedByAddresses);

  const approvedAddressList =  await checkIsApprovedForAll(contractAddress, ownedByAddresses, operatorAddress, Number(chainId));

  res.status(200).json({ data: approvedAddressList });

  return;
};

const checkIsApprovedForAll = async (contractAddress:any, ownerAddresses: any, operatorAddress: any, chainId: any) => {
  const rpcUrl = getRpcUrl(chainId);
  const provider = new ethers.JsonRpcProvider(rpcUrl as string);
  const erc721Contract = new ethers.Contract(
    contractAddress, 
    ["function isApprovedForAll(address _owner, address _operator) external view returns (bool)"],
    provider);
  const approvedForAllAddress = [];
  for (const ownerAddress of ownerAddresses) {
    const isApproved = await erc721Contract.isApprovedForAll(ownerAddress.walletAddress, operatorAddress);
    if (isApproved) {
      approvedForAllAddress.push(ownerAddress.hundle);
    }
  }

  console.log(approvedForAllAddress);
  return approvedForAllAddress;
}


const getRpcUrl = (
  chainId: any
) => {
  switch (chainId) {
    case 1: { 
      return process.env.INFURA_RPC_API_ETH_MAINNET as string;
    }
    case 5: { 
      return process.env.INFURA_RPC_API_ETH_GOERLI as string;
    }
    case 59140: { 
      return process.env.INFURA_RPC_API_LINEA_TESTNET as string;
    }
    default: {
      console.log('ChainId not supported.')
      return false;
    }
  }
}