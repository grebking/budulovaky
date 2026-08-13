import React, { useEffect, useMemo, useState } from 'react'
import { FLASHSCORE_URL, LALIGA_PLAYERS } from '../data/laligaPlayers'
import { createBetId, loadBets, saveBets } from '../utils/betStorage'
import { getUserId, getUserLabel } from '../utils/userLabel'

const STATUS_LABELS = {
  open: 'Looking for opponent',
  matched: 'Match locked — check Flashscore after the game',
  resolved: 'Settled',
}

function BetStatusBadge({ status }) {
  const styles = {
    open: 'bg-amber-50 text-amber-800 border-amber-200',
    matched: 'bg-blue-50 text-blue-800 border-blue-200',
    resolved: 'bg-gray-100 text-gray-700 border-gray-200',
  }

  return (
    <span
      className={`text-xs font-medium px-2 py-1 rounded-full border ${styles[status] ?? styles.open}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function PlayerSelect({ value, onChange, excludePlayer, id }) {
  const options = LALIGA_PLAYERS.filter((player) => player.name !== excludePlayer)

  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
    >
      <option value="">Pick a La Liga player</option>
      {options.map((player) => (
        <option key={player.name} value={player.name}>
          {player.name} ({player.team})
        </option>
      ))}
    </select>
  )
}

function getPlayerTeam(playerName) {
  return LALIGA_PLAYERS.find((player) => player.name === playerName)?.team ?? ''
}

export default function LaLigaGuess({ user, walletAddress }) {
  const userId = getUserId(user, walletAddress)
  const userLabel = getUserLabel(user, walletAddress)

  const [bets, setBets] = useState(() => loadBets())
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [stake, setStake] = useState('1')
  const [challengePlayer, setChallengePlayer] = useState('')
  const [activeChallengeId, setActiveChallengeId] = useState(null)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    saveBets(bets)
  }, [bets])

  const openBets = useMemo(
    () => bets.filter((bet) => bet.status === 'open' && bet.creatorId !== userId),
    [bets, userId],
  )

  const myBets = useMemo(
    () =>
      bets.filter(
        (bet) => bet.creatorId === userId || bet.opponentId === userId,
      ),
    [bets, userId],
  )

  const postChallenge = () => {
    setFormError(null)

    const stakeValue = Number(stake)
    if (!selectedPlayer) {
      setFormError('Pick a player for their team’s next La Liga match.')
      return
    }
    if (!Number.isFinite(stakeValue) || stakeValue <= 0) {
      setFormError('Enter a valid stake (e.g. 1 for $1).')
      return
    }

    const newBet = {
      id: createBetId(),
      creatorId: userId,
      creatorLabel: userLabel,
      creatorPlayer: selectedPlayer,
      creatorTeam: getPlayerTeam(selectedPlayer),
      creatorStake: stakeValue,
      opponentId: null,
      opponentLabel: null,
      opponentPlayer: null,
      opponentTeam: null,
      opponentStake: null,
      status: 'open',
      winnerSide: null,
      createdAt: Date.now(),
    }

    setBets((current) => [newBet, ...current])
    setSelectedPlayer('')
    setStake('1')
  }

  const acceptChallenge = (betId) => {
    setFormError(null)

    const bet = bets.find((entry) => entry.id === betId)
    if (!bet || bet.status !== 'open') return

    if (!challengePlayer) {
      setFormError('Pick your player to take this bet.')
      return
    }
    if (challengePlayer === bet.creatorPlayer) {
      setFormError('Pick a different player than the challenger.')
      return
    }

    setBets((current) =>
      current.map((entry) =>
        entry.id === betId
          ? {
              ...entry,
              status: 'matched',
              opponentId: userId,
              opponentLabel: userLabel,
              opponentPlayer: challengePlayer,
              opponentTeam: getPlayerTeam(challengePlayer),
              opponentStake: entry.creatorStake,
            }
          : entry,
      ),
    )
    setActiveChallengeId(null)
    setChallengePlayer('')
  }

  const settleBet = (betId, winnerSide) => {
    setBets((current) =>
      current.map((entry) =>
        entry.id === betId
          ? { ...entry, status: 'resolved', winnerSide }
          : entry,
      ),
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-8 pt-2">
      <p className="text-sm text-gray-500 max-w-3xl mb-6">
        Find someone at the bar, post your player for their next La Liga match, and match with
        someone betting on another player. After the game, check{' '}
        <a
          href={FLASHSCORE_URL}
          target="_blank"
          rel="noreferrer"
          className="text-gray-900 underline underline-offset-2"
        >
          Flashscore match ratings
        </a>
        — higher rating wins. Settle wins and losses by hand.
      </p>

      {formError && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 max-w-3xl">
          {formError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2 max-w-5xl">
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-medium text-gray-900 mb-1">Open challenges</h2>
          <p className="text-sm text-gray-500 mb-4">
            Someone already picked their player — take the other side.
          </p>

          {openBets.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-xl">
              No open bets. Post yours or wait for someone at the bar.
            </p>
          ) : (
            <ul className="space-y-3">
              {openBets.map((bet) => (
                <li
                  key={bet.id}
                  className="rounded-xl border border-gray-200 p-4 bg-gray-50/50"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        ${bet.creatorStake} on {bet.creatorPlayer}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {bet.creatorTeam} · next match · by {bet.creatorLabel}
                      </p>
                    </div>
                    <BetStatusBadge status={bet.status} />
                  </div>

                  {activeChallengeId === bet.id ? (
                    <div className="mt-3 space-y-3">
                      <PlayerSelect
                        id={`challenge-${bet.id}`}
                        value={challengePlayer}
                        onChange={setChallengePlayer}
                        excludePlayer={bet.creatorPlayer}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => acceptChallenge(bet.id)}
                          className="flex-1 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          Match ${bet.creatorStake} bet
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveChallengeId(null)
                            setChallengePlayer('')
                          }}
                          className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setFormError(null)
                        setActiveChallengeId(bet.id)
                        setChallengePlayer('')
                      }}
                      className="mt-2 w-full px-3 py-2 text-sm font-medium text-gray-900 border border-gray-300 rounded-lg hover:bg-white transition-colors"
                    >
                      Take this bet
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-medium text-gray-900 mb-1">Post a challenge</h2>
          <p className="text-sm text-gray-500 mb-4">
            Pick your La Liga player for their next match and how much you want to bet.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-2">
                Your player
              </label>
              <PlayerSelect
                id="create-player"
                value={selectedPlayer}
                onChange={setSelectedPlayer}
              />
            </div>

            <div>
              <label
                htmlFor="stake"
                className="block text-xs uppercase tracking-wide text-gray-400 mb-2"
              >
                Stake ($)
              </label>
              <input
                id="stake"
                type="number"
                min="0.01"
                step="0.01"
                value={stake}
                onChange={(event) => setStake(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            <button
              type="button"
              onClick={postChallenge}
              className="w-full px-4 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Post challenge
            </button>
          </div>
        </section>
      </div>

      {myBets.length > 0 && (
        <section className="mt-8 max-w-5xl">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Your bets</h2>
          <ul className="space-y-4">
            {myBets.map((bet) => {
              const isCreator = bet.creatorId === userId
              const myPlayer = isCreator ? bet.creatorPlayer : bet.opponentPlayer
              const theirPlayer = isCreator ? bet.opponentPlayer : bet.creatorPlayer
              const myStake = isCreator ? bet.creatorStake : bet.opponentStake
              const won =
                bet.status === 'resolved' &&
                (bet.winnerSide === 'creator'
                  ? isCreator
                  : bet.winnerSide === 'opponent' && !isCreator)

              return (
                <li
                  key={bet.id}
                  className="rounded-2xl border border-gray-200 p-5 bg-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <BetStatusBadge status={bet.status} />
                    {bet.status === 'resolved' && (
                      <span
                        className={`text-sm font-medium ${won ? 'text-green-700' : 'text-red-600'}`}
                      >
                        {won ? 'You won' : 'You lost'}
                      </span>
                    )}
                  </div>

                  {bet.status === 'open' && isCreator && (
                    <p className="text-gray-900 font-medium">
                      ${bet.creatorStake} on {bet.creatorPlayer} ({bet.creatorTeam})
                    </p>
                  )}

                  {bet.status !== 'open' && (
                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
                      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                        <p className="text-xs uppercase text-gray-400 mb-1">
                          {bet.creatorLabel}
                        </p>
                        <p className="font-medium text-gray-900">
                          ${bet.creatorStake} on {bet.creatorPlayer}
                        </p>
                        <p className="text-xs text-gray-500">{bet.creatorTeam}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                        <p className="text-xs uppercase text-gray-400 mb-1">
                          {bet.opponentLabel}
                        </p>
                        <p className="font-medium text-gray-900">
                          ${bet.opponentStake} on {bet.opponentPlayer}
                        </p>
                        <p className="text-xs text-gray-500">{bet.opponentTeam}</p>
                      </div>
                    </div>
                  )}

                  {bet.status === 'open' && isCreator && (
                    <p className="text-sm text-gray-500">
                      Waiting for someone to bet on another player…
                    </p>
                  )}

                  {bet.status === 'matched' && (
                    <div className="border-t border-gray-100 pt-4 mt-2">
                      <p className="text-sm text-gray-600 mb-3">
                        After the match, open Flashscore and compare player ratings. Mark the
                        winner by hand.
                      </p>
                      <a
                        href={FLASHSCORE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-gray-900 underline underline-offset-2 mr-4"
                      >
                        Open Flashscore La Liga
                      </a>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => settleBet(bet.id, 'creator')}
                          className="px-3 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700"
                        >
                          {bet.creatorPlayer} won
                        </button>
                        <button
                          type="button"
                          onClick={() => settleBet(bet.id, 'opponent')}
                          className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          {bet.opponentPlayer} won
                        </button>
                      </div>
                    </div>
                  )}

                  {bet.status === 'resolved' && (
                    <p className="text-sm text-gray-500">
                      You bet ${myStake} on {myPlayer}. Winner:{' '}
                      {bet.winnerSide === 'creator' ? bet.creatorPlayer : bet.opponentPlayer}{' '}
                      (vs {theirPlayer})
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
