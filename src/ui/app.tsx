/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { ToastContainer, toast } from 'react-toastify';
import { PolyjuiceHttpProvider } from '@polyjuice-provider/web3';
import { AddressTranslator } from 'nervos-godwoken-integration';

import './app.scss';
import 'react-toastify/dist/ReactToastify.css';
import { CONFIG } from '../config';
import { APIKEYS } from '../apikeys';
import { ImageStorageWrapper } from '../lib/contracts/ImageStorageWrapper';
import * as TokenContract from '../../build/contracts/ERC20.json';

const addressTranslator = new AddressTranslator();

async function createWeb3() {
    // Modern dapp browsers...
    if ((window as any).ethereum) {
        const godwokenRpcUrl = CONFIG.WEB3_PROVIDER_URL;
        const providerConfig = {
            rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
            ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
            web3Url: godwokenRpcUrl
        };
        const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
        const web3 = new Web3(provider);

        try {
            // Request account access if needed
            await (window as any).ethereum.enable();
        } catch (error) {
            // User denied account access...
        }

        return web3;
    }

    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    return null;
}

export function App() {
    const [web3, setWeb3] = useState<Web3>(null);
    const [contract, setContract] = useState<ImageStorage>();
    const [accounts, setAccounts] = useState<string[]>();
    const [depositAddress, setDepositAddress] = useState<string | undefined>();
    const [polyjuiceAddress, setPolyjuiceAddress] = useState<string | undefined>();
    const [balance, setBalance] = useState<bigint>();
    const [SUDTBalance, setSUDTBalance] = useState<bigint>();
    const [image, setImage] = useState('');
    const [existingContractIdInputValue, setExistingContractIdInputValue] = useState<string>();
    const [imageList, setImageList] = useState([]);
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const toastId = React.useRef(null);
    const [newStoredNumberInputValue, setNewStoredNumberInputValue] = useState<
        number | undefined
    >();

    useEffect(() => {
        if (transactionInProgress && !toastId.current) {
            toastId.current = toast.info(
                'Transaction in progress. Confirm MetaMask signing dialog and please wait...',
                {
                    position: 'top-right',
                    autoClose: false,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    closeButton: false
                }
            );
        } else if (!transactionInProgress && toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
        }
    }, [transactionInProgress, toastId.current]);

    useEffect(() => {
        async function getSUDTBalance() {
            const contract = new web3.eth.Contract(
                TokenContract.abi as any,
                "0xDBe8D0970F8A6cF8d7b213b60dfEe46ebAA321d8"
            );
    
            const value = await contract.methods.balanceOf(polyjuiceAddress).call({
                from: accounts?.[0]
            });
            console.log('SUDTBalance', value);
            setSUDTBalance(value);
        };

        if(contract) getSUDTBalance();
    }, [polyjuiceAddress])

    const account = accounts?.[0];

    async function deployContract() {
        const _contract = new ImageStorageWrapper(web3);

        try {
            setTransactionInProgress(true);

            await _contract.deploy(account);
            setExistingContractAddress(_contract.address);

            const depositAddress = await addressTranslator.getLayer2DepositAddress(web3, account);
            console.log(`Layer 2 Deposit Address on Layer 1: \n${depositAddress.addressString}`);
            setDepositAddress(depositAddress.addressString);
            
            const polyjuiceAddress = addressTranslator.ethAddressToGodwokenShortAddress(account);
            console.log(`Polyjuice Address: ${polyjuiceAddress}\n`);
            setPolyjuiceAddress(polyjuiceAddress);

            await getSUDTBalance();
            
            toast(
                'Successfully deployed a smart-contract. You can now proceed to get or set the value in a smart contract.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast('There was an error sending your transaction. Please check developer console.');
        } finally {
            setTransactionInProgress(false);
        }
    }

    async function callGetImages() {
        const res = await contract.getImages(account);
        toast('Successfully fetch images.', { type: 'success' });
        console.log(res)
        setImageList(res);
    }

    const getFile = async event => {
        const file = event.target.files[0];
        console.log(file);
        setImage(file);
    }

    async function setExistingContractAddress(contractAddress: string) {
        const _contract = new ImageStorageWrapper(web3);
        _contract.useDeployed(contractAddress.trim());

        setContract(_contract);
        setImageList([]);

        const depositAddress = await addressTranslator.getLayer2DepositAddress(web3, account);
        console.log(`Layer 2 Deposit Address on Layer 1: \n${depositAddress.addressString}`);
        setDepositAddress(depositAddress.addressString);
        
        const polyjuiceAddress = addressTranslator.ethAddressToGodwokenShortAddress(account);
        console.log(`Polyjuice Address: ${polyjuiceAddress}\n`);
        setPolyjuiceAddress(polyjuiceAddress);
    }

    async function addNewImage() {
        try {
            setTransactionInProgress(true);

            const url = `https://uploads.slate.host/api/public/${APIKEYS.CERTIFICATETEMPLATE_COLLECTIONID}`;
    
            let data = new FormData();
            data.append("data", image);
        
            const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: APIKEYS.SLATEAPIKEY,
            },
            body: data
            });
            const json = await response.json();
            console.log(json);

            await contract.addImageOnContract(json.data.cid, json.data.name, account);
            toast(
                'Successfully added images. You can refresh the read value now manually.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast('There was an error sending your transaction. Please check developer console.');
        } finally {
            setTransactionInProgress(false);
        }
    }

    useEffect(() => {
        if (web3) {
            return;
        }

        (async () => {
            const _web3 = await createWeb3();
            setWeb3(_web3);

            const _accounts = [(window as any).ethereum.selectedAddress];
            setAccounts(_accounts);
            console.log({ _accounts });

            if (_accounts && _accounts[0]) {
                const _l2Balance = BigInt(await _web3.eth.getBalance(_accounts[0]));
                setBalance(_l2Balance);
            }
        })();
    });

    const LoadingIndicator = () => <span className="rotating-icon">⚙️</span>;

    return (
        <div className="container">
            <div className="card text-dark bg-light">
                <div className="card-body">
                    <p>Your ETH address: <b>{accounts?.[0]}</b></p>
                    <p>Your Polyjuice address: <b> {polyjuiceAddress || <LoadingIndicator />}</b></p>
                    <p>Balance: <b>{balance ? (balance / 10n ** 8n).toString() : <LoadingIndicator />} ETH</b></p>
                    <p>SUDT Balance: <b>{SUDTBalance ? (SUDTBalance / 10 ** 18).toString() : <LoadingIndicator />} ckETH</b></p>
                </div>
            </div>
            <p className="text-break mt-3">Your Deposit address to use for Force Bridge: <b> {depositAddress}</b></p>
            <a
                target="_blank"
                className="btn btn-info"
                rel="noopener noreferrer"
                href="https://force-bridge-test.ckbapp.dev/bridge/Ethereum/Nervos?xchain-asset=0x0000000000000000000000000000000000000000"
            >Use Force Bridge</a>
            <hr />
            <p>
                The button below will deploy a Image Storage smart contract.  After the contract is deployed you can either
                read stored value from smart contract or set a new one. You can do that using the
                interface below.
            </p>
            <button onClick={deployContract} disabled={!balance}>
                Deploy contract
            </button>
            &nbsp;or&nbsp;
            <input
                placeholder="Existing contract id"
                onChange={e => setExistingContractIdInputValue(e.target.value)}
            />
            <button
                disabled={!existingContractIdInputValue || !balance}
                onClick={() => setExistingContractAddress(existingContractIdInputValue)}
            >
                Use existing contract
            </button>
            <br />
            Deployed contract address: <b>{contract?.address || '-'}</b> <br />
            <br />
            <button onClick={callGetImages} disabled={!contract}>
                Get Images
            </button>
            <div className="row">
                {imageList
                    && imageList.map(list => (
                        <div className="col-sm-12 col-md-4 col-lg-3" key={list.id}>
                            <div className="card" style={{ width: '18rem '}}>
                                <img src={`https://slate.textile.io/ipfs/${list.cid}`} className="card-img-top" alt="Image" />
                                <div className="card-body">
                                    <p className="card-text">{list.name}</p>
                                    <p>{list.from}</p>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>
            <br />
            <br />
            <input type="file" onChange={getFile}/>
            <br />
            <br />
            <button onClick={addNewImage} disabled={!image}>
                Save
            </button>
            <br />
            <br />
            <br />
            <br />
            <hr />
            <ToastContainer />
        </div>
    );
}
