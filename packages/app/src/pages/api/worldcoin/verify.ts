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
  const { token } = JSON.parse(req.body);
  const result = await verify(token);
  console.log('result', result);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  // another common pattern
  // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  );
  res.status(200).json({ result });
};

export default handler;
