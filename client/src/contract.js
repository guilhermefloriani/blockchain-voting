// @flow
import truffleContract from 'truffle-contract'
import { getWeb3 } from './utils'
import VotingContract from './contracts/Voting.json'

export type Contract = {
  instance: any,
  web3: any
}

export default async function getContract(): Promise<Contract> {
  // Get network provider and web3 instance.
  const web3 = await getWeb3()

  // Get the contract instance.
  const contract = truffleContract(VotingContract)
  contract.setProvider(web3.currentProvider)
  contract.defaults({ from: web3.eth.accounts[0], gas: 6721975 })
  const instance = await contract.deployed()

  return { instance, web3 }
}

export function createPoll(
  contract: Contract,
  description: string,
  options: string[],
  tokens: string[]
): Promise<*> {
  const { instance, web3 } = contract
  return instance.createPoll(
    web3.fromAscii(description),
    options.map(web3.fromAscii),
    tokens.map(web3.fromAscii)
  )
}

export function closePoll(contract: Contract, id: number): Promise<*> {
  return contract.instance.closePoll(id)
}

export function castVote(
  contract: Contract,
  token: string,
  pollId: number,
  proposalId: number
) {
  const { instance, web3 } = contract
  return instance.castVote(web3.fromAscii(token), pollId, proposalId)
}

export async function getPolls(contract: Contract) {
  const { instance } = contract
  const length = await instance.getPollsMapSize()
  const polls = []
  for (let i = 0; i < length.valueOf(); i++) {
    polls.push(getPoll(contract, i))
  }
  return Promise.all(polls)
}

async function getPoll(contract: Contract, id: number): Promise<Poll> {
  const { instance, web3 } = contract
  const [description, proposalsCount, closed] = await instance.getPoll(id)
  return {
    id,
    closed,
    description: web3.toAscii(description),
    proposals: await getProposals(contract, id, proposalsCount)
  }
}

function getProposals(
  contract: Contract,
  pollId: number,
  count: number
): Promise<Proposal[]> {
  const proposals = []
  for (let i = 0; i < count.valueOf(); i++) {
    proposals.push(getProposal(contract, pollId, i))
  }
  return Promise.all(proposals)
}

async function getProposal(
  contract: Contract,
  pollId: number,
  id: number
): Promise<Proposal> {
  const { instance, web3 } = contract
  const data = await instance.getProposal(pollId, id)
  return {
    id,
    description: web3.toAscii(data)
  }
}

export async function getResults(
  contract: Contract,
  poll: Poll
): Promise<PollResults> {
  const { id, proposals } = poll
  return await Promise.all(
    proposals.map(proposal => getVoteCount(contract, id, proposal.id))
  )
}

async function getVoteCount(
  contract: Contract,
  poll: number,
  proposal: number
): Promise<{ proposal: number, votes: number }> {
  const { instance } = contract
  const count = await instance.getVoteCount(poll, proposal)
  return { proposal, votes: count.valueOf() }
}
