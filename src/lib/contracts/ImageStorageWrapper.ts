import Web3 from 'web3';
import * as ImageStorageJSON from '../../../build/contracts/ImageStorage.json';
//import { ImageStorage } from '../../types/ImageStorage';

const DEFAULT_SEND_OPTIONS = {
    gas: 6000000
};

export class ImageStorageWrapper {
    web3: Web3;

    contract: ImageStorage;

    address: string;

    constructor(web3: Web3) {
        this.web3 = web3;
        this.contract = new web3.eth.Contract(ImageStorageJSON.abi as any) as any;
    }

    get isDeployed() {
        return Boolean(this.address);
    }

    async getImages(fromAddress: string) {
        const count = await this.contract.methods.imageCount().call({ from: fromAddress });
        let list = [];

        for(let i = 1; i <= count; i++){
            const data = await this.contract.methods.images(i).call({ from: fromAddress });
            list.push(data);
            console.log(data)
        }
        
        return list;
    }

    async addImageOnContract(cid: string, name: string, fromAddress: string) {
        const tx = await this.contract.methods.addImages(cid, name).send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress,
            cid,
            name
        });

        return tx;
    }

    async deploy(fromAddress: string) {
        const deployTx = await (this.contract
            .deploy({
                data: ImageStorageJSON.bytecode,
                arguments: []
            })
            .send({
                ...DEFAULT_SEND_OPTIONS,
                from: fromAddress,
                to: '0x0000000000000000000000000000000000000000'
            } as any) as any);

        this.useDeployed(deployTx.contractAddress);

        return deployTx.transactionHash;
    }

    useDeployed(contractAddress: string) {
        this.address = contractAddress;
        this.contract.options.address = contractAddress;
    }
}