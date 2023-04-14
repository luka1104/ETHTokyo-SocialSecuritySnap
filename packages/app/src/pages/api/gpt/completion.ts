import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios';
import { ethers } from 'ethers';
import Web3 from 'web3';

type Data = {
  data: any;
}
type FunctionDetails = {
  functionName: string;
  functionArgs: Array<any>;
}

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
  const { contractAddress, inputData } = req.query;
  const strContractAddress = contractAddress as string;
  const strInputData = inputData as string;

  try {
    let ResponseData = '';

    const contractDetails = await getContractDetails(strContractAddress);
    if (!contractDetails) {
      ResponseData += '【WARNING】The safety of the function you are trying to execute cannot be confirmed because it has not been published.';
      return ResponseData;
    }

    const contractFunctionDetails = await getContractFunctionDetails(strInputData, contractDetails.abi);
    ResponseData += await getGptCompletion(strContractAddress, contractDetails.contractName, contractFunctionDetails.functionName, contractFunctionDetails.functionArgs);
    return ResponseData;
  } catch (error) {
    console.error(error);
    return { error: 'An Error Occurred' };
  }
}

/**
 * コンストラクト詳細情報を取得する
 */
const getContractDetails = async (
  contractAddress: string
) => {
  const apiKey = process.env.ETHERSCAN_API_KEY as string;
  const apiEndpoint = process.env.ETHERSCAN_API_ENDPIINT as string;
  const apiUri = `${apiEndpoint}/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;

  const response = await axios.get(apiUri);
  const result = response.data.result;
  if (!(result && result[0])) {
    return false;
  }

  return {
    contractName: result[0].ContractName,
    contractCode: result[0].SourceCode,
    abi: result[0].ABI
  };
}

/**
 * コントラクトのアセンブリコードを取得する
 */
const getContractDecompiledCode = async (
  contractAddress: string
) => {
  // コンストラクタのバイトコードを取得する
  const providerUrl = process.env.INFURA_ETHEREUM_URL as string;
  const web3 = new Web3(providerUrl);
  const bytecode: string = await web3.eth.getCode(contractAddress);

  // TODO: バイトコードを逆コンパイルして、アセンブリコードを取得する

  return bytecode;
}

/**
 * コントラクト関数シグネチャをもとに、実行される関数名, 引数を取得する
 */
const getContractFunctionDetails = (
  inputData: string,
  contractABI: Array<any>
): FunctionDetails => {
  const contractInterface = new ethers.Interface(contractABI);
  const decodedFunctionData = contractInterface.parseTransaction({ data: inputData });

  return {
    functionName: (decodedFunctionData as ethers.TransactionDescription).name,
    functionArgs: (decodedFunctionData as ethers.TransactionDescription).args,
  }
}

/**
 * コントラクト情報をもとに、GPT-3で関数の実行内容を推測する
 */
const getGptCompletion = async (
  contractAddress: string,
  contractName: string,
  functionName: string,
  functionArgs: Array<any>,
) => {
  const apiKey = process.env.GPT_API_KEY as string;
  const apiEndpoint = process.env.GPT_API_ENDPOINT as string;
  const apiUri = `${apiEndpoint}/v1/chat/completions`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };
  const content = `・ContractAddress:${contractAddress}\n・ContractName:${contractName}\n・FunctionName:${functionName}\n・FunctionArgs:${functionArgs}\nPlease tell me what this function does?`
  const data = {
    'model': 'gpt-3.5-turbo',
    'messages': [{
      'role': 'user',
      'content': content
    }]
  }

  const response = await axios.post(apiUri, data, { headers: headers });
  if (response.status !== 200) {
    throw new Error('Failed to get GPT completion.');
  }

  const result = response.data.choices[0].message.content;
  return result;
}
