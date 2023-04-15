import { useContext, useEffect } from 'react';
import styled from 'styled-components';
import {
  Card,
  ConnectButton,
  InstallFlaskButton,
  ReconnectButton,
  SubscribeButton,
  WorldIdButton,
} from '../components';
import { MetaMaskContext, MetamaskActions } from '../hooks';
import {
  connectSnap,
  getSnap,
  getWorldIdFromSnaps,
  setWorldIdToSnaps,
  shouldDisplayReconnectButton,
  subscribe,
} from '../utils';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin-top: 7.6rem;
  margin-bottom: 7.6rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
  }
`;

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
`;

const Span = styled.span`
  color: ${(props) => props.theme.colors.primary.default};
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 64.8rem;
  width: 100%;
  height: 100%;
  margin-top: 1.5rem;
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error.muted};
  border: 1px solid ${({ theme }) => theme.colors.error.default};
  color: ${({ theme }) => theme.colors.error.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
    margin-bottom: 1.2rem;
    margin-top: 1.2rem;
    max-width: 100%;
  }
`;

const Index = () => {
  const [state, dispatch] = useContext(MetaMaskContext);

  const handleConnectClick = async () => {
    try {
      await connectSnap();
      const installedSnap = await getSnap();

      dispatch({
        type: MetamaskActions.SetInstalled,
        payload: installedSnap,
      });
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const handleSubmitClick = async () => {
    try {
      await subscribe();
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const handleVerify = async (idToken: string) => {
    const result = await fetch('http://localhost:3000/api/worldcoin/verify', {
      mode: 'no-cors',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: idToken,
      }),
    });

    if (result.status === 500) {
      console.error(result);
      return;
    }

    await setWorldIdToSnaps(idToken);
    const res = await getWorldIdFromSnaps();

    console.log(res);
  };

  // metamaskからwalletAddressを取得する処理
  const getWalletAddress = async () => {
    return await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
  };

  const handleWorldIdConnect = async () => {
    const walletAddress = await getWalletAddress();
    window.location.href = `https://id.worldcoin.org/authorize?client_id=app_f81f65835b4fd56adfa56adddcc256e3&response_type=code%20id_token&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2F&state=${walletAddress}&nonce=${new Date().getTime()}`;
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(document.location.search);
    const idToken = searchParams.get('id_token');

    if (idToken) {
      handleVerify(idToken);
    }
  }, []);

  return (
    <Container>
      <Heading>
        Welcome to <Span>SocialSecuritySnap</Span>
      </Heading>
      <CardContainer>
        {state.error && (
          <ErrorMessage>
            <b>An error happened:</b> {state.error.message}
          </ErrorMessage>
        )}
        {!state.isFlask && (
          <Card
            content={{
              title: 'Install',
              description:
                'Snaps is pre-release software only available in MetaMask Flask, a canary distribution for developers with access to upcoming features.',
              button: <InstallFlaskButton />,
            }}
            fullWidth
          />
        )}
        {!state.installedSnap && (
          <Card
            content={{
              title: 'Connect',
              description:
                'Get started by connecting to and installing the example snap.',
              button: (
                <ConnectButton
                  onClick={handleConnectClick}
                  disabled={!state.isFlask}
                />
              ),
            }}
            disabled={!state.isFlask}
          />
        )}
        {shouldDisplayReconnectButton(state.installedSnap) && (
          <Card
            content={{
              title: 'Reconnect',
              description:
                'While connected to a local running snap this button will always be displayed in order to update the snap if a change is made.',
              button: (
                <ReconnectButton
                  onClick={handleConnectClick}
                  disabled={!state.installedSnap}
                />
              ),
            }}
            disabled={!state.installedSnap}
          />
        )}
        <Card
          content={{
            title: 'Subscribe',
            description: 'Subscribe SocialSecuritySnap.',
            button: (
              <SubscribeButton
                onClick={handleSubmitClick}
                disabled={!state.installedSnap}
              />
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            state.isFlask &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
        <Card
          content={{
            title: 'World ID',
            description: 'Connect with World ID.',
            button: (
              <WorldIdButton
                onClick={handleWorldIdConnect}
                disabled={!state.installedSnap}
              />
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            state.isFlask &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
      </CardContainer>
    </Container>
  );
};

export default Index;
