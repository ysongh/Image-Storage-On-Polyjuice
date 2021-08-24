# Image Storage Application
An dapp deploy on Polyjuice where you can store images

## Running this Dapp
- Run the following command to install the dependencies, build the smart contracts, and start Ganache to run a local Ethereum development chain.
```
yarn
yarn build
yarn start:ganache
```

- Create a file called 'apikeys.ts' on the src folder and add the following code
```
export const APIKEYS = {
    SLATEAPIKEY: "<Create API key from slate.host>"
};
```

- Start UI by open a new terminal and run the following command
```
yarn ui
```