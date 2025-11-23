// CardPointe Gateway API Library
// This module handles credit card authorization requests to CardPointe Gateway

export interface CardPointeAuthRequest {
  merchid: string;
  account: string;
  expiry: string;
  amount: string;
  currency: string;
  capture: 'y' | 'n';
  cvv2: string;
  receipt?: 'y' | 'n';
  email?: string;
  name?: string;
  postal?: string;
  userfields?: Record<string, string>;
}

export interface CardPointeAuthResponse {
  respstat: 'A' | 'B' | 'C'; // A=Approved, B=Retry, C=Declined
  retref: string; // Retrieval reference number (transaction ID)
  respcode: string; // Response code
  resptext: string; // Response text
  authcode?: string; // Authorization code
  respproc: string; // Response processor
  amount: string; // Amount authorized
  cvvresp?: string; // CVV response
  avsresp?: string; // AVS response
  emv?: string; // EMV data
  commcard?: string; // Commercial card flag
  token?: string; // Token for future use
  batchid?: string; // Batch ID
}

export function getCardPointeConfig() {
  const site = process.env.CARDPOINTE_SITE;
  const merchantId = process.env.CARDPOINTE_MERCHANT_ID;
  const username = process.env.CARDPOINTE_API_USERNAME;
  const password = process.env.CARDPOINTE_API_PASSWORD;

  if (!site) {
    throw new Error('CARDPOINTE_SITE is not defined in environment variables');
  }
  if (!merchantId) {
    throw new Error('CARDPOINTE_MERCHANT_ID is not defined in environment variables');
  }
  if (!username) {
    throw new Error('CARDPOINTE_API_USERNAME is not defined in environment variables');
  }
  if (!password) {
    throw new Error('CARDPOINTE_API_PASSWORD is not defined in environment variables');
  }

  return {
    site,
    merchantId,
    username,
    password,
    apiUrl: `https://${site}.cardconnect.com/cardconnect/rest`,
  };
}

export async function authorizeTransaction(
  request: CardPointeAuthRequest
): Promise<CardPointeAuthResponse> {
  const config = getCardPointeConfig();
  const authHeader = Buffer.from(`${config.username}:${config.password}`).toString('base64');

  const response = await fetch(`${config.apiUrl}/auth`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authHeader}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`CardPointe API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as CardPointeAuthResponse;
}

export function isTransactionApproved(response: CardPointeAuthResponse): boolean {
  return response.respstat === 'A';
}

export function formatAmountToCents(dollarAmount: number): string {
  return Math.round(dollarAmount * 100).toString();
}
