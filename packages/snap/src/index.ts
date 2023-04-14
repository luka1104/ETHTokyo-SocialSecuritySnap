import { OnTransactionHandler } from '@metamask/snaps-types';
import { divider, heading, panel, text } from '@metamask/snaps-ui';

type WalletAddress = string;
type ContractAddress = string;
type InputData = string;

const baseURL = 'http://localhost:3000/api';

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

const getLensFollowing = async (walletAddress: WalletAddress) => {
  const response = await fetch(
    `${baseURL}/lens/following?walletAddress=${walletAddress}`,
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
) => {
  const response = await fetch(
    `${baseURL}/gpt/completion?contractaddress=${contractAddress}&inputdata=${inputData}`,
  );

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

/**
 * Handle an incoming transaction, and return any insights.
 *
 * @param args - The request handler args as object.
 * @param args.transaction - The transaction object.
 * @returns The transaction insights.
 */
export const onTransaction: OnTransactionHandler = async ({ transaction }) => {
  const myWalletAddress = transaction.from?.toString() || 'dummyAddress';
  const contractAddress = transaction.to?.toString() || 'dummyAddress';

  // const tempAddress = '0xC0B97BF68795A27865c647e801893CC1C3B0d5F6';

  // const [lensProfile, lensFollowing] = await Promise.all([
  //   getLensProfile(tempAddress),
  //   getLensFollowing(tempAddress),
  // ]);

  return {
    content: panel([
      heading('contract Insights'),
      divider(),
      text('myWalletAddress:'),
      text(myWalletAddress),
      text('contractAddress:'),
      text(contractAddress),
      heading('lens Insights'),
      divider(),
      text('lensProfile:'),
      // text(lensProfile),
      text('lensFollowing:'),
      // text(lensFollowing),
      heading('GPT Insights'),
      divider(),
      text('GPT Insights'),
      text('**GPT Insights**'),
    ]),
  };
};
