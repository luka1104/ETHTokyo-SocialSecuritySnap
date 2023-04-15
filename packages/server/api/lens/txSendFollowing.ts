import { apolloClient } from './utils/apollo-client';
import { FollowingDocument, FollowingRequest } from './utils/graphql/generated';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ethers } from 'ethers';
import axios from 'axios';

type Data = {
  data: any;
};
type ABI = Array<{
  type?: string;
  name?: string;
  inputs?: Array<unknown>;
  outputs?: Array<unknown>;
  stateMutability?: string;
  anonymous?: boolean;
  constant?: boolean;
}>;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  switch (method) {
    case 'GET':
      getTxSendFollowing(req, res);
      break;
    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

const getTxSendFollowing = async (req: VercelRequest, res: VercelResponse) => {
  const { walletAddress, contractAddress, inputData, chainId } = req.query;
  const result = await getFollowingRequest({
    address: walletAddress,
  });

  console.log('following: result', result);

  const ownedByAddresses = result.items.map((item: any) => {
    return { walletAddress: item.ownedBy, handle: item.handle };
  });
  console.log(ownedByAddresses);

  const contractTransactions = await getContractTransactions(
    contractAddress as string,
    Number(chainId),
  );

  const senderWallets = findSenderWallets(
    contractTransactions,
    ownedByAddresses,
  );

  res.status(200).json({ data: 'lukaluka.test, konikoni.test, volvol.test' });

  // res.status(200).json({ data: senderWallets });

  return;
};

const getFollowingRequest = async (request: FollowingRequest) => {
  const result = await apolloClient.query({
    query: FollowingDocument,
    variables: {
      request,
    },
  });

  return result.data.following;
};

const getContractTransactions = async (
  contractAddress: string,
  chainId: number,
) => {
  const apiUrl = getContractDetailsApiEndpoint(chainId, contractAddress);

  try {
    const response = await axios.get(apiUrl as string);
    if (response.data.result) {
      return response.data.result;
    } else {
      throw new Error('No transactions found');
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
};

const findSenderWallets = (
  transactions: any,
  walletAddresses: any,
): string[] => {
  const senders = new Set<string>();

  transactions.forEach((transaction: { from: string }) => {
    walletAddresses.forEach((walletAddress: any) => {
      if (
        transaction.from.toLowerCase() ===
        walletAddress.walletAddress.toLowerCase()
      ) {
        senders.add(walletAddress.hundle);
      }
    });
  });

  return Array.from(senders);
};

/**
 * Get the API Endpoint for obtaining detailed information on the construct
 */
const getContractDetailsApiEndpoint = (
  chainId: number,
  contractAddress: string,
) => {
  switch (chainId) {
    case 1: {
      // Eth Mainnet
      let apiKey = process.env.ETHERSCAN_API_KEY as string;
      return `https://api.etherscan.io/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;
    }
    case 5: {
      // Goerli Testnet
      let apiKey = process.env.ETHERSCAN_API_KEY as string;
      return `https://api-goerli.etherscan.io/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;
    }
    case 137: {
      // Polygon Mainnet
      let apiKey = process.env.POLYGONSCAN_API_KEY as string;
      return `https://api.polygonscan.com/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;
    }
    case 80001: {
      // Mumbai Testnet
      let apiKey = process.env.POLYGONSCAN_API_KEY as string;
      return `https://api-testnet.polygonscan.com/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;
    }
    case 59140: {
      // Linea Testnet
      return `https://explorer.goerli.linea.build/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;
    }
    default: {
      console.log('ChainId not supported.');
      return false;
    }
  }
};
