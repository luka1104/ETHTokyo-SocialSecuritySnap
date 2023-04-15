import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios';
import { ethers } from 'ethers';

type Data = {
  data: any;
}
type FunctionDetails = {
  functionName: string;
  functionArgs: Array<any>;
  functionAbi: object;
}
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
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      const responseData = await getResponseData(req);
      res.status(200).json({ 'data': responseData });
      break;
    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

/**
 * APIレスポンス値を取得する
 */
const getResponseData = async (
  req: NextApiRequest
) => {
  const { contractAddress, inputData, chainId } = req.query;
  const strContractAddress = contractAddress as string;
  const strInputData = inputData as string;
  const chainIdNumber = Number(chainId);

  try {
    let ResponseData = '';

    const contractDetails = await getContractDetails(chainIdNumber, strContractAddress);
    if (!contractDetails) {
      ResponseData += '【WARNING】 The safety of the function you are trying to execute cannot be confirmed because it has not verified.';
      return ResponseData;
    }

    const contractFunctionDetails = await getContractFunctionDetails(strInputData, contractDetails.abi);
    const functionSourceCode = getFunctionSourceCode(contractDetails.contractCode, contractFunctionDetails.functionName);
    ResponseData += await getGptCompletion(strContractAddress, contractDetails.contractName, functionSourceCode, contractFunctionDetails);

    return ResponseData;
  } catch (error) {
    console.error(error);
    return { error: 'An Error Occurred'};
  }
}

/**
 * コンストラクト詳細情報を取得する
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
 * コンストラクト詳細情報取得用のAPIエンドポイントを取得する
 */
const getContractDetailsApiEndpoint = (
  chainId: number,
  contractAddress: string
) => {
  switch (chainId) {
    case 1: { // Ethメインネットワーク
      let apiKey = process.env.ETHERSCAN_API_KEY as string;
      return `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
    }
    case 5: { // Goerliテストネットワーク
      let apiKey = process.env.ETHERSCAN_API_KEY as string;
      return `https://api-goerli.etherscan.io//api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
    }
    case 59140: { // Linea Testnet
      return `https://explorer.goerli.linea.build/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
    }
    default: {
      console.log('ChainId not supported.')
      return false;
    }
  }
}

/**
 * コントラクト関数シグネチャをもとに、実行される関数名, 引数, 関数のABIを取得する
 */
const getContractFunctionDetails = (
  inputData: string,
  contractABI: string
): FunctionDetails => {
  const contractInterface = new ethers.Interface(contractABI);
  const decodedFunctionData = contractInterface.parseTransaction({ data: inputData });
  const functionName = (decodedFunctionData as ethers.TransactionDescription).name;
  const functionArgs = (decodedFunctionData as ethers.TransactionDescription).args;

  // 実行される関数のABIを取得する
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

/**
 * コントラクトコードから関数のソースコードを抽出する 
 */
const getFunctionSourceCode = (
  contractCode: string,
  functionName: string
) => {
  const delimiter = "function";
  const stringArray = contractCode.split(delimiter);

  let functionSourceCode = ''
  stringArray.forEach((item, index) => {
    const pattern: RegExp = new RegExp(`(${functionName}.*{)`);
    if (pattern.test(item)) {
      functionSourceCode += item;
    }
  });

  if (functionSourceCode === '') {
    console.log(`Function '${functionName}' not found in contract code.`)
  }
  return functionSourceCode;
}

/**
 * コントラクト情報をもとに、GPT-3で関数の実行内容を推測する
 */
const getGptCompletion = async (
  contractAddress: string,
  contractName: string,
  functionSourceCode: string,
  contractFunctionDetails: FunctionDetails
) => {
  const apiKey = process.env.GPT_API_KEY as string;
  const apiEndpoint = process.env.GPT_API_ENDPOINT as string;
  const apiUri = `${apiEndpoint}/v1/chat/completions`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };
  const content = `・ContractAddress: ${contractAddress}\n・ContractName: ${contractName}\n・FunctionName: ${contractFunctionDetails.functionName}\n・FunctionArgs: ${contractFunctionDetails.functionArgs}\n・FunctionABI: ${contractFunctionDetails.functionAbi}\n・FunctionSourceCode: ${functionSourceCode}\nPlease tell me what the above smart contract executes.`;
  const data = {
    'model': 'gpt-3.5-turbo',
    'messages': [{
      'role': 'user',
      'content': content
    }]
  };

  const response = await axios.post(apiUri, data, { headers: headers });
  if (response.status !== 200) {
    throw new Error('Failed to get GPT completion.');
  }

  const result = response.data.choices[0].message.content;
  return result;
}
