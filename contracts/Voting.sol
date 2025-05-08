// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract Voting {
    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    struct Voter {
        bool hasVoted;
        uint votedCandidateId;
    }

    mapping(uint => Candidate) public candidates;
    mapping(address => Voter) public voters;
    uint public candidatesCount;
    address public admin;
    bool public votingOpen;

    event CandidateAdded(uint candidateId, string name);
    event VoteCasted(address voter, uint candidateId);
    event VotingStarted();
    event VotingEnded();

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier votingIsOpen() {
        require(votingOpen, "Voting is not open");
        _;
    }

    constructor() {
        admin = msg.sender;
        votingOpen = false;
    }

    function addCandidate(string memory _name) public onlyAdmin {
        require(!votingOpen, "Cannot add candidates after voting starts");
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
        emit CandidateAdded(candidatesCount, _name);
    }

    function startVoting() public onlyAdmin {
        require(!votingOpen, "Voting is already open");
        votingOpen = true;
        emit VotingStarted();
    }

    function endVoting() public onlyAdmin {
        require(votingOpen, "Voting is not open");
        votingOpen = false;
        emit VotingEnded();
    }

    function vote(uint _candidateId) public votingIsOpen {
        require(!voters[msg.sender].hasVoted, "You have already voted");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID");

        voters[msg.sender] = Voter(true, _candidateId);
        candidates[_candidateId].voteCount++;
        
        emit VoteCasted(msg.sender, _candidateId);
    }

    function getCandidate(uint _candidateId) public view returns (uint, string memory, uint) {
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID");
        Candidate memory candidate = candidates[_candidateId];
        return (candidate.id, candidate.name, candidate.voteCount);
    }

    function registerVoter(address _voter) public onlyAdmin {
    require(!voters[_voter].hasVoted, "Voter is already registered");
    voters[_voter] = Voter(false, 0);
}

}
