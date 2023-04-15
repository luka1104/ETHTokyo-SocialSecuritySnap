import {
  OnRpcRequestHandler,
  OnTransactionHandler,
} from '@metamask/snaps-types';
import { copyable, divider, heading, panel, text } from '@metamask/snaps-ui';

type WalletAddress = string;
type ContractAddress = string;
type InputData = string;
type ChainId = string;

const baseURL = 'https://eth-tokyo-social-security-snap-app.vercel.app/api';

const getLensProfile = async (walletAddress: WalletAddress) => {
  const response = await fetch(
    `${baseURL}/lens/profile?walletAddress=${walletAddress}`,
  );

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

const lensTxSendFollowing = async (
  walletAddress: WalletAddress,
  contractAddress: ContractAddress,
  inputData: InputData,
  chainId: ChainId,
) => {
  const response = await fetch(
    `${baseURL}/lens/txSendFollowing?walletAddress=${walletAddress}&contractAddress=${contractAddress}&inputData=${inputData}&chainId=${chainId}`,
  );

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

const getGptCompletion = async (
  contractAddress: ContractAddress,
  inputData: InputData,
  chainId: ChainId,
) => {
  const response = await fetch(
    `${baseURL}/gpt/completion?contractAddress=${contractAddress}&inputData=${inputData}&chainId=${chainId}`,
  );

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

const verifyWorldIdToken = async (token: string) => {
  const response = await fetch(`${baseURL}/worldcoin/auth?token=${token}`);

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();

  return data.result;
};

/**
 * Handle an incoming transaction, and return any insights.
 *
 * @param args - The request handler args as object.
 * @param args.chainId - The chainId string.
 * @param args.transaction - The transaction object.
 * @returns The transaction insights.
 */
export const onTransaction: OnTransactionHandler = async ({
  chainId,
  transaction,
}) => {
  const data = await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  });

  if (!data) {
    return {
      content: panel([
        heading('Not a unique human!!'),
        text('Please prove that you are a unique human.'),
        copyable('https://eth-tokyo-social-security-snap-site.vercel.app/'),
      ]),
    };
  }

  const verifiedWorldId = await verifyWorldIdToken(data.worldId as string);
  if (!verifiedWorldId) {
    return {
      content: panel([
        heading('Not a unique human!!'),
        text('Please prove that you are a unique human.'),
        copyable('https://eth-tokyo-social-security-snap-site.vercel.app/'),
      ]),
    };
  }

  const myWalletAddress = transaction.from?.toString();
  const contractAddress = transaction.to?.toString();
  const inputData = transaction.data?.toString();

  if (!myWalletAddress || !contractAddress || !inputData || !chainId) {
    throw new Error('Missing required parameters');
  }

  const extractedChainId = chainId.split(':')[1];

  const [lensProfile, lensApprovedAddressList, gptCompletion] =
    await Promise.all([
      getLensProfile(myWalletAddress),
      lensTxSendFollowing(
        myWalletAddress,
        contractAddress,
        inputData,
        extractedChainId,
      ),
      getGptCompletion(contractAddress, inputData, extractedChainId),
    ]);

  console.log(lensProfile);
  console.log(lensApprovedAddressList);

  return {
    content: panel([
      heading('Verified with World ID🌐'),
      divider(),
      text(verifiedWorldId.sub),
      heading('Lens Insights🌿'),
      divider(),
      text('LensProfile:'),
      text(lensProfile.data?.handle || 'none'),
      text('LensFollowingExecution:'),
      lensApprovedAddressList.length > 0
        ? lensApprovedAddressList.map((address: string) => text(address))
        : text('none'),
      heading('GPT Insights🤖'),
      divider(),
      text(gptCompletion.data),
    ]),
  };
};

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({ request }) => {
  switch (request.method) {
    case 'setData':
      return await snap.request({
        method: 'snap_manageState',
        params: {
          operation: 'update',
          newState: { worldId: request.params.worldId },
        },
      });
    case 'getData':
      return await snap.request({
        method: 'snap_manageState',
        params: { operation: 'get' },
      });
    default:
      throw new Error('Method not found.');
  }
};
