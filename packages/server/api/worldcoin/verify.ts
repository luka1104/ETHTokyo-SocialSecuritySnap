import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as jose from 'jose';

const verify = async (token: string) => {
  const JWKS = jose.createRemoteJWKSet(
    new URL('https://id.worldcoin.org/jwks.json'),
  );
  // @ts-ignore
  const { payload, header } = await jose.jwtVerify(token, JWKS, {
    issuer: 'https://id.worldcoin.org',
    aud: 'app_f91c6534554696a6072fd51a1d39df92',
  });
  console.log(payload, header);

  return payload;
};

const handler = async (req: VercelRequest, res: VercelResponse) => {
  const { token } = req.body;
  const result = await verify(token);
  res.status(200).json({ result });
};

export default handler;
