// eslint-disable-next-line @typescript-eslint/no-require-imports
const authorizenet = require('authorizenet');

const ApiContracts = authorizenet.APIContracts;
const ApiControllers = authorizenet.APIControllers;
const Constants = authorizenet.Constants;

// Lazy initialization function
export function getMerchantAuthentication() {
  if (!process.env.AUTHORIZENET_API_LOGIN_ID) {
    throw new Error('AUTHORIZENET_API_LOGIN_ID is not defined in environment variables');
  }

  if (!process.env.AUTHORIZENET_TRANSACTION_KEY) {
    throw new Error('AUTHORIZENET_TRANSACTION_KEY is not defined in environment variables');
  }

  const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(process.env.AUTHORIZENET_API_LOGIN_ID);
  merchantAuthenticationType.setTransactionKey(process.env.AUTHORIZENET_TRANSACTION_KEY);

  return merchantAuthenticationType;
}

// Use sandbox for testing, production for live
export const isProduction = process.env.AUTHORIZENET_ENVIRONMENT === 'production';

export { ApiContracts, ApiControllers, Constants };
