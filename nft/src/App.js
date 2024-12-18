import React, { useState } from "react";
import { ethers } from "ethers";
import axios from "axios";

const PINATA_API_KEY = '223553f88ea60420fae4';
const PINATA_SECRET_KEY = '36b531be959f28db2b3a9b8672fe4243dd82ccf518624ebbffd1b5b1280ec78d';

const CONTRACT_ADDRESS = "0x41B6805b9e91bd46087E9bCEAA6141D16b4D567D";
const ABI = [
    {
        "inputs": [
            { "internalType": "string", "name": "tokenUri", "type": "string" }
        ],
        "name": "mintnft",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const App = () => {
    const [walletAddress, setWalletAddress] = useState(null);
    const [error, setError] = useState("");
    const [image, setImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const connectWallet = async () => {
        if (!window.ethereum) {
            setError("MetaMask is not installed.");
            return;
        }
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            setWalletAddress(address);
            setError('');
        } catch (err) {
            setError(err.message || "An error occurred while connecting wallet.");
        }
    };

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file && (file.type === 'image/png' || file.type === 'image/jpeg') && file.size < 5 * 1024 * 1024) {
            setImage(file);
        } else {
            setError("Please upload a valid PNG or JPEG image under 5MB");
        }
    };

    const uploadToPinata = async (file) => {
        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('pinataOptions', JSON.stringify({
                cidVersion: 0
            }));

            const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'pinata_api_key': PINATA_API_KEY,
                    'pinata_secret_api_key': PINATA_SECRET_KEY
                }
            });

            const imageUrl = `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;

            // Create metadata
            const metadata = {
                name: file.name,
                image: imageUrl,
                description: "My NFT Description"
            };

            const metadataRes = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', 
                metadata, 
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'pinata_api_key': PINATA_API_KEY,
                        'pinata_secret_api_key': PINATA_SECRET_KEY
                    }
                }
            );

            setIsUploading(false);
            return `https://gateway.pinata.cloud/ipfs/${metadataRes.data.IpfsHash}`;

        } catch (err) {
            setIsUploading(false);
            console.error("Detailed IPFS Upload Error:", err.response ? err.response.data : err);
            setError(`Error uploading file to Pinata: ${err.response ? err.response.data.error : err.message}`);
            return null;
        }
    };

    const mintNFT = async () => {
        if (!image) {
            setError("Please upload an image.");
            return;
        }
        try {
            const metadataUrl = await uploadToPinata(image);
            if (!metadataUrl) return;

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

            const tx = await contract.mintnft(metadataUrl);
            await tx.wait();

            alert(`NFT minted successfully! Metadata URL: ${metadataUrl}`);
        } catch (err) {
            setError(err.message || "Error minting NFT.");
        }
    };

    return (
        <div>
            <h1>Basic NFT DApp</h1>
            <button onClick={connectWallet}>
                {walletAddress ? `Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connect Wallet"}
            </button>
            {error && <p style={{ color: "red" }}>{error}</p>}

            <div style={{ marginTop: "20px" }}>
                <input type="file" onChange={handleImageUpload} />
                <button 
                    onClick={mintNFT} 
                    style={{ marginLeft: "10px" }}
                    disabled={isUploading}
                >
                    {isUploading ? "Uploading..." : "Mint NFT"}
                </button>
            </div>
        </div>
    );
};

export default App;