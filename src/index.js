const base64 = require('base64-arraybuffer')
import './Errors.js';
import WalletBubble from './WalletBubble';
import HTTPClient from './HTTPClient.js';
const IPFSURL = 'https://snapalgo-imgs.netlify.app/imgs' 
const importIcon = IPFSURL + '/import-wallet.svg'
const connectedGif = IPFSURL + '/connected.gif'
import CSSInjector from './cssInjector.js';
import $ from "jquery";
export class Wallet{
    
    constructor(_snapid="npm:algorand"){
      
      $('head').append('<meta name="viewport" content="width=device-width, initial-scale=0.5">');
      this._snapid = _snapid;
      this.enabled = false;
      this.genesisHash = null;
      this.genesisID = null;
      this.enabledAccounts = [];
      this.accounts = []
      this.network = "";
      this.injector = new CSSInjector();
      this.bubble = new WalletBubble(this.injector);
      window.algorand = this;
    }
    async enable(opts){

      if(!opts){
        opts = {};
      }

      let IdTable = {
        "mainnet-v1.0":"wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=",
        "testnet-v1.0":	"SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
        "betanet-v1.0":	"mFgazF+2uRS1tMiL9dsj01hJGySEmPN28B/TjjvpVW0="
      };
      try{
        await ethereum.request({
          method: 'wallet_requestSnaps',
          params: {
            'npm:algorand': {},
          },
        });
      }
      catch(e){
        if(e.code === 4001){
          console.log("rejected");
          return;
        }
        else{
          alert("you must install metamask flask to use this libary")
          throw(e);
        }
      }
      console.log("about to load accounts")
      this.accounts = await ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId:this._snapid, 
          request:{
            method: 'getAccounts'
          }
        }
      })
      console.log(this.accounts);
      let genesisIDProvided = false;
      let genesisHashProvided = false;
      let accountsProvided = false;
      let matchVerified = false;
      
      if(opts.hasOwnProperty('genesisID')){
        if(!(opts.genesisID in IdTable)){
          throw({code: 4300, "message": "network is not supported"});
        }
        this.genesisID = opts.genesisID;
        genesisIDProvided = true;
        
      }
      
      if(opts.hasOwnProperty('genesisHash')){
        if(!Object.values(IdTable).includes(opts.genesisHash)){
          throw({code: 4300, "message": "network is not supported"});
        }
        this.genesisHash = opts.genesisHash;
        genesisHashProvided = true;
      }
      
      if(opts.hasOwnProperty('accounts')){
        this.enabledAccounts = opts.accounts;
        accountsProvided = true;
      }
      if(genesisIDProvided && genesisHashProvided){
        if(IdTable[this.genesisID] !== this.genesisHash){
          throw({code: 4300, "message": "network Id and Network Hash do not match"});
        }
      }
      if(genesisIDProvided && !genesisHashProvided){
        this.genesisHash = IdTable[this.genesisID];
        genesisHashProvided = true;
      }
      if(genesisHashProvided && !genesisIDProvided){
        this.genesisID = Object.keys(IdTable).find(key => IdTable[key] === this.genesisHash);
        genesisIDProvided = true;
      }
      if(!genesisIDProvided || !genesisHashProvided || !accountsProvided){
        let masterDiv = document.createElement('div');
        let importWalletButton = document.createElement('img');
        let importDiv = document.createElement('div');
        importDiv.style = "display:flex; justify-content:right;";
        masterDiv.appendChild(importDiv);
        importWalletButton.src = importIcon;
        this.injector.inject(importWalletButton,"width: 50px; height: 50px; cursor:pointer; margin: 5px;");
        importWalletButton.addEventListener('click', ()=>{window.open("https://snapalgo.io/importaccount", "_blank")})
        importDiv.appendChild(importWalletButton);
        let megaDiv = document.createElement('div');
        this.injector.inject(megaDiv, "display:flex; justify-content:center; text-align: center; transform: translateY(-10%);")
        let mainDiv = document.createElement('div');
        this.injector.inject(mainDiv, "display:flex; justify-content:center; flex-direction: column; text-align: center;")
        megaDiv.appendChild(mainDiv);
        masterDiv.appendChild(megaDiv);
        
        if(!genesisIDProvided || !genesisHashProvided){
          let networkTitle = document.createElement('p');
          this.injector.inject(networkTitle, "margin-top: 20px;");
          networkTitle.innerHTML = "Select a Network";
          mainDiv.appendChild(networkTitle);
          this.networkSelect = document.createElement('select');
          this.injector.inject(this.networkSelect, "width: 200px; height: 25px; text-align: center;");
          this.networkSelect.innerHTML = Object.keys(IdTable).map(key => `<option value="${key}">${
            key.split('-')[0][0].toUpperCase() //get just the network name and capitalize the first letter
            +
            key.split('-')[0].slice(1) //combine with the rest of the network name
          }</option>`).join('');
          mainDiv.appendChild(this.networkSelect);
        }
        if(!accountsProvided){
          let accountsTitle = document.createElement('p');
          this.injector.inject(accountsTitle, "margin-top: 20px;");
          accountsTitle.innerHTML = "Select an Account";
          mainDiv.appendChild(accountsTitle);
          this.accountSelect = document.createElement('select');
          this.injector.inject(this.accountSelect, "width: 200px; height: 25px; text-align: center;");
          const Addrs = Object.keys(this.accounts)
          this.accountSelect.innerHTML = Addrs.map((addr)=>`<option value="${addr}">${this.accounts[addr].name}</option>`).join("");
          mainDiv.appendChild(this.accountSelect);
        }
        let center = document.createElement('center');
        mainDiv.appendChild(document.createElement('br'));
        
        let connectButton = document.createElement('button');
        connectButton.innerHTML = "Connect";

        connectButton.className = "snapAlgoDefaultButton-alt";
        
        connectButton = this.injector.inject(connectButton, "height: 35px; font-size: 15px;");
        center.appendChild(connectButton);
        mainDiv.appendChild(center);
        this.bubble.setElement(masterDiv);
        this.width = 400;
        this.bubble.setWidth(400);
        this.bubble.setHeight(300);
        this.bubble.open();
        return new Promise(((resolve, reject)=>{
          const selectFunc = async () => {
            if(this.networkSelect){
              this.genesisID = this.networkSelect.value;
              this.genesisHash = IdTable[this.networkSelect.value];
              
            }
            if(this.accountSelect){
              this.enabledAccounts = [this.accountSelect.value];
              this.account = this.accountSelect.value;
            }
            this.#connect();
            resolve({accounts: [this.account], genesisID: this.genesisID, genesisHash: this.genesisHash});
            
          }
          connectButton.addEventListener('click', selectFunc.bind(this));
        }).bind(this))
      }
      
          
          
    }
      
    async #connect(){
      this.bubble.importAccounts([this.accounts[this.enabledAccounts[0]]]);
      this.bubble.importNetwork(this.genesisID);
      this.enabled = true;
      this.bubble.open({
        html:`
          <center>
            <p>Connected</p>
            <img width="150px" height="150px" src="${connectedGif}"/>
          </center>`,
          height: 250
      })
      await window.ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId:this._snapid, 
          request:{
            method: 'setAccount',
            params:{
              address: 	this.enabledAccounts[0]
            }
          }
        }        
      })
      this.bubble.walletUi.screen = 'base';
      await this.bubble.preLoad();
      await setTimeout(()=>this.bubble.close(), 500);
    }

    

    #formatError(error){
      let err = error.message.split("\n");
      let code = err[0];
      let msg = err[1];
      throw({message: msg, code: code});
    }
  
    
    async signAndPostTxns(walletTransactions){
      try{
        let testnet = false;
        if(this.genesisHash === "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="){
          testnet = true;
        }
        return await window.ethereum.request({
          method: 'wallet_invokeSnap',
          params: {
            snapId: this._snapid, 
            request: {
              method: 'signAndPostTxns',
              params:{
                txns: walletTransactions,
                testnet: testnet
              }
          }}
        })
      }
      catch(error){
        this.#formatError(error);
      }
    }
    getAlgodv2Client(){
      const networkTable = {
        "mainnet-v1.0": "mainnet",
        "testnet-v1.0": "testnet",
        "betanet-v1.0": "betanet"
      }
      const network = networkTable[this.genesisID];
      return new HTTPClient().get("algod", network);
    }
      
    getIndexerClient(){
      const networkTable = {
        "mainnet-v1.0": "mainnet",
        "testnet-v1.0": "testnet",
        "betanet-v1.0": "betanet"
      }
      const network = networkTable[this.genesisID];
      return new HTTPClient().get("index", network);
    }
    
    async signTxns(walletTransactions){
      if(!this.enabled){
        throw("not enabled");
      }
      try{
        let testnet = false;
        if(this.genesisHash === "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="){
          testnet = true;
        }
        return await ethereum.request({
          method: 'wallet_invokeSnap',
          params: {
            snapId:this._snapid, 
            request:{
            method: 'signTxns',
            params:{
              txns: walletTransactions,
              testnet: testnet
            }
          }}
        })
      }
      catch(error){
        this.#formatError(error);
      }
      
    }
    async postTxns(stxns){
      try{
        return await ethereum.request({
          method: 'wallet_invokeSnap',
          params: {
            snapId:this._snapid, 
            request:{
              method: 'postTxns',
              params:{
                stxns: stxns
              }
          }}
        })
      }
      catch(error){
        this.#formatError(error);
      }
    }

    encodeTxn(txn){
      const msgpack = require('./encoding.js');
      const b64 = require('base64-arraybuffer');
      //will be implemented later
      let obj = txn.get_obj_for_encoding()
      obj = msgpack.encode(obj);
      return b64.encode(obj);
    }



    async EZsign(txn){
      const b64 = require('base64-arraybuffer');
      txn = [{txn:this.encodeTxn(txn)}];
      let signedTxs = await this.signTxns(txn);
      return Array.from(signedTxs.map(stxB64 => b64.decode(stxB64).buffer));
    }

    base64Encode(arraybuffer){
      const b64 = require('base64-arraybuffer');
      const base64Output = b64.encode(arraybuffer);
      return base64Output;
    }

    base64Decode(arraybuffer){
      const b64 = require('base64-arraybuffer');
      arraybuffer = b64.decode(arraybuffer);
      return new Uint8Array(arraybuffer);
    }

    async EZsignAndPost(txn){
      const b64 = require('base64-arraybuffer');
      txn = [{txn:this.encodeTxn(txn)}];
      return this.signAndPostTxns(txn);
    }

    async EZsignSmartSig(logicSigAccount){
      const msgpack = require('./encoding.js');
      let EncodedLogicSigAccount = this.base64Encode(logicSigAccount.toByte());
      try{
        const EncodedSignedAccount = await ethereum.request({
          method: 'wallet_invokeSnap',
          params: {
            snapId:this._snapid, 
            request:{
            method: 'signLogicSig',
            params:{
              logicSigAccount: EncodedLogicSigAccount,
            }
          }}
        })
      }
      catch(error){
        this.#formatError(error);
      }
      let encodedMsgPack = this.base64Decode(EncodedSignedAccount);
      let decodedMsgPack = msgpack.decode(encodedMsgPack);
      logicSigAccount.sigkey = decodedMsgPack.sigkey;
      logicSigAccount.lsig.sig = decodedMsgPack.lsig.sig;
      return logicSigAccount
      
    }

    
    
    //--------------------------------- swapping functions -----------------------------------
  
    //get minium swap amount
    //current tickers are BSC| ETH | Algo
    async getMin(fromTicker, toTicker){
      const result = await ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId:this._snapid, 
          request: {
            method: 'getMin',
            params:{
              from: fromTicker,
              to: toTicker
            }
        }}
      })
      return result
    }
    //current ticker are BSC | ETH | ALGO
    async preSwap(fromTicker, toTicker, amount){
      const result = await ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId:this._snapid, 
          request: {
          method: 'preswap',
          params:{
            from: fromTicker,
            to: toTicker,
            amount: amount
          }
        }}
      })
      return result

    }
    //email is optional
    async swap(fromTicker, toTicker, amount, email){
      let testnet = false;
      if(this.genesisHash === "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="){
        testnet = true;
      }
      const result = await ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId:this._snapid, 
          request:{
            method: 'swap',
            params:{
              from: fromTicker, 
              to: toTicker,
              amount: amount,
              email: email,
              testnet: testnet
            }
        }}
      })
      return result
    }
    //returns the swap history of the current address
    async getSwapHistory(){
      const result = await ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: this._snapid, 
          request: {
          method: 'swapHistory',
        }}
      })
      return result;
    }
    async getAddress(){
      const result = await window.ethereum.request({
        method: 'wallet_invokeSnap',
        params:{
          snapId: this._snapid,
          request: {
            method: 'getAddress'
        }}
      });
      return result;
    }
  }