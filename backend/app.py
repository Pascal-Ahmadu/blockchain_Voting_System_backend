import json
import random, string
import time
from flask import Flask, jsonify, request
from flask_cors import CORS
from web3 import Web3
from eth_account.messages import encode_defunct
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Simple in-memory store for session data (use Redis in production)
session_store = {}

# CORS configuration
CORS(app,
     origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://blockchain-voting-frontend.vercel.app"],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "OPTIONS"],
     expose_headers=["Content-Type"],
     max_age=600)

# Replace Ganache connection with Infura
infura_project_id = os.environ.get('INFURA_PROJECT_ID')
infura_url = f"https://sepolia.infura.io/v3/{infura_project_id}"
web3 = Web3(Web3.HTTPProvider(infura_url))

# Load smart contract
contract_address = Web3.to_checksum_address("0x8912ED01D24cba70A535598Af18C38C48e44c585")


# Actual contract ABI from your deployed contract

contract_abi = [
    {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
    {"anonymous":False,"inputs":[{"indexed":False,"internalType":"uint256","name":"candidateId","type":"uint256"},{"indexed":False,"internalType":"string","name":"name","type":"string"}],"name":"CandidateAdded","type":"event"},
    {"anonymous":False,"inputs":[{"indexed":False,"internalType":"address","name":"voter","type":"address"},{"indexed":False,"internalType":"uint256","name":"candidateId","type":"uint256"}],"name":"VoteCasted","type":"event"},
    {"anonymous":False,"inputs":[],"name":"VotingEnded","type":"event"},
    {"anonymous":False,"inputs":[],"name":"VotingStarted","type":"event"},
    {"inputs":[{"internalType":"string","name":"_name","type":"string"}],"name":"addCandidate","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"candidates","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"string","name":"name","type":"string"},{"internalType":"uint256","name":"voteCount","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"candidatesCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"endVoting","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_candidateId","type":"uint256"}],"name":"getCandidate","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"string","name":"","type":"string"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"_voter","type":"address"}],"name":"registerVoter","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"startVoting","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_candidateId","type":"uint256"}],"name":"vote","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"voters","outputs":[{"internalType":"bool","name":"hasVoted","type":"bool"},{"internalType":"uint256","name":"votedCandidateId","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"votingOpen","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}
]

# Initialize contract with complete ABI
try:
    contract = web3.eth.contract(address=contract_address, abi=contract_abi)
    print(f"Contract loaded successfully at {contract_address}")
except Exception as e:
    print(f"Error loading contract: {e}")
    contract = None

# Debug middleware
@app.before_request
def before_request():
    print(f"→ {request.method} {request.path}")
    print(f"→ Headers: {dict(request.headers)}")
    print(f"→ Session store: {session_store}")

@app.after_request
def after_request(response):
    print(f"← Status: {response.status}")
    print(f"← Response Headers: {dict(response.headers)}")
    return response

# Clean expired sessions periodically
def clean_expired_sessions():
    current_time = time.time()
    expired_keys = [k for k, v in session_store.items() if v.get("expires_at", 0) < current_time]
    for key in expired_keys:
        del session_store[key]

# ================================================
# 🔹 AUTHENTICATION ENDPOINTS
# ================================================
@app.route('/api/nonce', methods=['POST', 'OPTIONS'])
def get_nonce():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    wallet_address = data.get('walletAddress')
    if not wallet_address:
        return jsonify({"error": "walletAddress required"}), 400

    # Convert to checksum address
    try:
        wallet_address = Web3.to_checksum_address(wallet_address)
    except ValueError as e:
        return jsonify({"error": f"Invalid wallet address: {str(e)}"}), 400

    nonce = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
    session_token = ''.join(random.choices(string.ascii_letters + string.digits, k=64))

    # Increase session duration
    session_store[session_token] = {
        "wallet_address": wallet_address,
        "nonce": nonce,
        "created_at": time.time(),
        "expires_at": time.time() + 3600  # Increase to 1 hour
    }

    clean_expired_sessions()
    
    return jsonify({"nonce": nonce, "sessionToken": session_token})

@app.route('/api/verify', methods=['POST', 'OPTIONS'])
def verify_signature():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    wallet_address = data.get('walletAddress')
    signature = data.get('signature')
    session_token = data.get('sessionToken')

    if not wallet_address or not signature or not session_token:
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        # Convert wallet address to checksum format
        wallet_address = Web3.to_checksum_address(wallet_address)
    except ValueError as e:
        return jsonify({"error": f"Invalid wallet address: {str(e)}"}), 400

    session_data = session_store.get(session_token)
    
    if not session_data:
        return jsonify({"error": "Session expired or invalid.", "sessionLost": True}), 400

    stored_nonce = session_data.get("nonce")
    stored_address = session_data.get("wallet_address")

    # Convert stored address before comparing
    if wallet_address.lower() != Web3.to_checksum_address(stored_address).lower():
        return jsonify({"error": "Wallet address mismatch"}), 400

    message = f"Sign this message to authenticate: {stored_nonce}"
    message_encoded = encode_defunct(text=message)

    try:
        recovered_address = web3.eth.account.recover_message(message_encoded, signature=signature)
        
        if recovered_address.lower() == wallet_address.lower():
            auth_token = ''.join(random.choices(string.ascii_letters + string.digits, k=64))

            session_data["authenticated"] = True
            session_data["auth_token"] = auth_token
            session_data["expires_at"] = time.time() + 3600  # 1 hour

            return jsonify({"success": True, "token": auth_token, "address": wallet_address})
        else:
            return jsonify({"error": "Signature verification failed"}), 400

    except Exception as e:
        return jsonify({"error": f"Error during signature recovery: {str(e)}"}), 400

    
@app.route('/api/check-auth', methods=['POST', 'OPTIONS'])
def check_auth():
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.get_json()
    session_token = data.get('sessionToken')
    
    # Debug info
    print(f"Checking auth for token: {session_token}")
    print(f"Session store keys: {list(session_store.keys())}")
    
    if not session_token or session_token not in session_store:
        print("Session token not found")
        return jsonify({"authenticated": False}), 200
        
    session_data = session_store.get(session_token)
    
    if not session_data.get("authenticated", False):
        print("Session not authenticated")
        return jsonify({"authenticated": False}), 200
        
    wallet_address = session_data.get("wallet_address")
    print(f"User authenticated with wallet: {wallet_address}")
    
    return jsonify({
        "authenticated": True,
        "walletAddress": wallet_address
    })

# ================================================
# 🔹 ADMIN ENDPOINTS
# ================================================
@app.route('/admin/add_candidate', methods=['POST'])
def add_candidate():
    try:
        data = request.get_json()
        candidate_name = data['name']
        private_key = os.getenv('PRIVATE_KEY')
        account = web3.eth.account.from_key(private_key).address
        
        nonce = web3.eth.get_transaction_count(account)
        
        tx = contract.functions.addCandidate(candidate_name).build_transaction({
            'chainId': 11155111,
            'gas': 300000,
            'gasPrice': web3.to_wei('10', 'gwei'),
            'nonce': nonce
        })
        
        signed_tx = web3.eth.account.sign_transaction(tx, private_key=private_key)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction.hex())
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)

        # Get the ID of the newly added candidate (last entry)
        candidate_count = contract.functions.candidatesCount().call()
        new_candidate = contract.functions.candidates(candidate_count).call()
        
        return jsonify({
            "id": new_candidate[0],
            "name": new_candidate[1],
            "voteCount": new_candidate[2]
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to add candidate: {str(e)}"}), 500

@app.route('/admin/start_voting', methods=['POST'])
def start_voting():
    try:
        private_key = os.getenv('PRIVATE_KEY')
        account = web3.eth.account.from_key(private_key)
        nonce = web3.eth.get_transaction_count(account.address)
        
        tx = contract.functions.startVoting().build_transaction({
            'chainId': 11155111,
            'gas': 300000,
            'gasPrice': web3.to_wei('10', 'gwei'),
            'nonce': nonce
        })
        
        signed_tx = web3.eth.account.sign_transaction(tx, private_key=private_key)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction.hex())
        web3.eth.wait_for_transaction_receipt(tx_hash)
        
        return jsonify({"message": "Voting has started!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/admin/end_voting', methods=['POST'])
def end_voting():
    try:
        private_key = os.getenv('PRIVATE_KEY')
        account = web3.eth.account.from_key(private_key)
        nonce = web3.eth.get_transaction_count(account.address)
        
        tx = contract.functions.endVoting().build_transaction({
            'chainId': 11155111,
            'gas': 300000,
            'gasPrice': web3.to_wei('10', 'gwei'),
            'nonce': nonce
        })
        
        signed_tx = web3.eth.account.sign_transaction(tx, private_key=private_key)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction.hex())
        web3.eth.wait_for_transaction_receipt(tx_hash)
        
        return jsonify({"message": "Voting has ended!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ================================================
# 🔹 VOTING ENDPOINTS
# ================================================
@app.route('/candidates', methods=['GET', 'OPTIONS'])
def get_candidates():
    if request.method == 'OPTIONS':
        return '', 200
        
    # Add better error handling and debugging
    if not contract:
        print("Contract not loaded - returning error response")
        return jsonify({
            "error": "Contract not loaded",
            "candidates": []
        }), 200
        
    try:
        candidates_count = contract.functions.candidatesCount().call()
        print(f"Found {candidates_count} candidates")
        candidates = []
        
        for i in range(1, candidates_count + 1):
            try:
                candidate = contract.functions.candidates(i).call()
                candidates.append({
                    'id': candidate[0],
                    'name': candidate[1],
                    'voteCount': candidate[2]
                })
            except Exception as e:
                print(f"Error getting candidate {i}: {str(e)}")
                
        return jsonify(candidates)
    except Exception as e:
        print(f"Error in get_candidates: {str(e)}")
        return jsonify({
            "error": str(e),
            "candidates": []
        }), 200

@app.route('/vote', methods=['POST'])
def cast_vote():
    data = request.get_json()
    session_token = data.get('sessionToken')
    candidate_id = data.get('candidateId')

    if not session_token or session_token not in session_store:
        return jsonify({"error": "Authentication required"}), 401

    voter_address = session_store[session_token]["wallet_address"]

    try:
        # Ensure the voter's address is in checksum format
        voter_address = Web3.to_checksum_address(voter_address)

        # Use private key to send transaction (since we're using Infura)
        private_key = os.getenv('PRIVATE_KEY')
        account = web3.eth.account.from_key(private_key)
        nonce = web3.eth.get_transaction_count(account.address)
        
        tx = contract.functions.vote(candidate_id).build_transaction({
            'chainId': 11155111,
            'gas': 300000,
            'gasPrice': web3.to_wei('10', 'gwei'),
            'nonce': nonce
        })
        
        signed_tx = web3.eth.account.sign_transaction(tx, private_key=private_key)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction.hex())
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)

        return jsonify({"message": "Vote cast successfully!", "txHash": tx_hash.hex()})
    except ValueError as e:
        return jsonify({"error": f"Invalid wallet address: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/results', methods=['GET', 'OPTIONS'])
def get_results():
    if request.method == 'OPTIONS':
        return '', 200
        
    if not contract:
        return jsonify({"error": "Contract not loaded"}), 500

    try:
        # Check if voting is open (since there's no votingEnded function)
        voting_open = contract.functions.votingOpen().call()
        
        # Get candidates
        candidates_count = contract.functions.candidatesCount().call()
        candidates = []
        for i in range(1, candidates_count + 1):
            candidate = contract.functions.candidates(i).call()
            candidates.append({
                'id': candidate[0],
                'name': candidate[1],
                'voteCount': candidate[2]
            })
            
        return jsonify({
            "votingOpen": voting_open,
            "votingEnded": not voting_open,  # Derive ended from open status
            "candidates": candidates
        })
    except Exception as e:
        print(f"Error in get_results: {str(e)}")
        return jsonify({"error": f"Error fetching results: {str(e)}"}), 500

@app.route('/register-voter', methods=['POST'])
def register_voter():
    data = request.get_json()
    voter_address = data.get('walletAddress')
    
    if not voter_address:
        return jsonify({"error": "Voter address is required"}), 400

    try:
        # Convert voter address to checksum format
        voter_address = Web3.to_checksum_address(voter_address)

        # Admin registers the voter using private key
        private_key = os.getenv('PRIVATE_KEY')
        account = web3.eth.account.from_key(private_key)
        nonce = web3.eth.get_transaction_count(account.address)
        
        tx = contract.functions.registerVoter(voter_address).build_transaction({
            'chainId': 11155111,
            'gas': 300000,
            'gasPrice': web3.to_wei('10', 'gwei'),
            'nonce': nonce
        })
        
        signed_tx = web3.eth.account.sign_transaction(tx, private_key=private_key)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction.hex())
        web3.eth.wait_for_transaction_receipt(tx_hash)
        
        return jsonify({"message": f"Voter {voter_address} registered successfully!"})
    except ValueError as e:
        return jsonify({"error": f"Invalid wallet address: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Add this to your Flask app
@app.route('/api/check-connection', methods=['GET'])
def check_connection():
    try:
        connected = web3.is_connected()
        chain_id = web3.eth.chain_id
        latest_block = web3.eth.block_number
        return jsonify({
            "connected": connected,
            "chainId": chain_id,
            "latestBlock": latest_block
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/check-contract', methods=['GET'])
def check_contract():
    try:
        if not contract:
            return jsonify({"error": "Contract not loaded"}), 500
            
        # Test contract by calling a simple view function
        try:
            candidates_count = contract.functions.candidatesCount().call()
            admin_address = contract.functions.admin().call()
            voting_open = contract.functions.votingOpen().call()
            
            return jsonify({
                "contract_address": contract_address,
                "candidatesCount": candidates_count,
                "admin": admin_address,
                "votingOpen": voting_open,
                "status": "Contract is working properly"
            })
        except Exception as contract_error:
            return jsonify({
                "contract_address": contract_address,
                "error": f"Contract call failed: {str(contract_error)}"
            }), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health')
@app.route('/')
def root():
    return jsonify({
        "status": "ready",
        "service": "Blockchain Voting API"
    }), 200

if __name__ == '__main__':
    print("Starting Flask app with in-memory session store...")
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)