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
  const { walletAddress, contractAddress, inputData, chainId } = req.query;
  const result = await getFollowingRequest({
    address: walletAddress,
  });


  console.log('following: result', result);

  const ownedByAddresses = result.items.map((item:any) =>  {
    return {walletAddress:item.ownedBy, handle:item.handle}
  });
  console.log(ownedByAddresses);


  let ResponseData = '';
  const contractDetails = await getContractDetails(Number(chainId), contractAddress as string);
    if (!contractDetails) {
      ResponseData += '【WARNING】 The safety of the function you are trying to execute cannot be confirmed because it has not verified.';
      return ResponseData;
    }

    const contractFunctionDetails = await getContractFunctionDetails(inputData as string, contractDetails.abi);

    const functionName = contractFunctionDetails.functionName;
    const functionArgs = contractFunctionDetails.functionArgs;

    let approvedAddressList = [];
    if (functionName === 'setApprovalForAll') {
      approvedAddressList =  await checkIsApprovedForAll(contractAddress, ownedByAddresses, functionArgs[0], Number(chainId));
    }
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
      approvedForAllAddress.push(ownerAddress.hundle as never);
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

/**
 * Get Construct Details
 */
const getContractDetails = async (
  chainId: number,
  contractAddress: string
) => {
  const apiUri = getContractDetailsApiEndpoint(chainId, contractAddress);
  if (!apiUri) {
    return false;
  }

  const response = await axios.get(apiUri);
  const result = response.data.result;
  if (!(result && result[0])) {
    return false;
  }

  const contractName = result[0].ContractName;
  const contractCode = result[0].SourceCode;
  const abi = result[0].ABI;
  if (!contractName || !contractCode || !abi) {
    return false;
  }

  return {
    contractName: contractName,
    contractCode: contractCode,
    abi: abi
  };
}

/**
 * Get the API Endpoint for obtaining detailed information on the construct
 */
const getContractDetailsApiEndpoint = (
  chainId: number,
  contractAddress: string
) => {
  switch (chainId) {
    case 1: { // Eth Mainnet
      let apiKey = process.env.ETHERSCAN_API_KEY as string;
      return `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
    }
    case 5: { // Goerli Testnet
      let apiKey = process.env.ETHERSCAN_API_KEY as string;
      return `https://api-goerli.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
    }
    // case 59140: { // Linea Testnet
    //   return `https://explorer.goerli.linea.build/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
    // }
    default: {
      console.log('ChainId not supported.')
      return false;
    }
  }
}


/**
 * Get the function name, arguments, and ABI of the function
 * to be executed based on the contract function signature
 */
const getContractFunctionDetails = (
  inputData: string,
  contractABI: string
) => {
  const contractInterface = new ethers.Interface(contractABI);
  const decodedFunctionData = contractInterface.parseTransaction({ data: inputData });
  const functionName = (decodedFunctionData as ethers.TransactionDescription).name;
  const functionArgs = (decodedFunctionData as ethers.TransactionDescription).args;

  // Get the ABI of the executed function
  const arrContractABI = JSON.parse(contractABI) as ABI;
  let functionAbi = arrContractABI.find((item) => item.type === "function" && item.name === functionName);
  if (!functionAbi) {
    console.log(`Function '${functionAbi}' not found in ABI.`)
    functionAbi = {};
  }

  return {
    functionName: functionName,
    functionArgs: functionArgs,
    functionAbi: functionAbi,
  }
}
