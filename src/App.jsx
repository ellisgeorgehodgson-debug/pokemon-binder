import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { POKEDEX } from './pokedex.js'

const STORAGE_KEY = 'pokemonBinder.caught'

function loadCaught() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return {}

  try {
    return JSON.parse(stored)
  } catch {
    return {}
  }
}

export default function App() {
  const [caught, setCaught] = useState(() => loadCaught())
  const [search, setSearch] = useState('')
  const [selectedDex, setSelectedDex] = useState(null)
  const [cardChoice, setCardChoice] = useState({
    cardName: '',
    cardUrl: '',
  })
  const [availableCards, setAvailableCards] = useState([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [cardsError, setCardsError] = useState(null)
  const [selectedCardId, setSelectedCardId] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(caught))
  }, [caught])

  const filteredPokemon = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return POKEDEX
    return POKEDEX.filter(
      (pokemon) =>
        pokemon.name.toLowerCase().includes(query) ||
        pokemon.dex.includes(query),
    )
  }, [search])

  const caughtCount = Object.keys(caught).length
  const selectedPokemon = selectedDex ? POKEDEX.find((pokemon) => pokemon.dex === selectedDex) : null
  const selectedPokemonCaught = selectedDex ? !!caught[selectedDex] : false
  const selectedCard = selectedCardId ? availableCards.find((c) => c.id === selectedCardId) : null
  const [selectionAction, setSelectionAction] = useState('card')

  useEffect(() => {
    setSelectionAction('card')
  }, [selectedDex])

  function handleChoiceChange(event) {
    const { name, value } = event.target
    setCardChoice((current) => ({ ...current, [name]: value }))
  }

  function selectPokemon(dex) {
    setSelectedDex(dex)
    if (caught[dex]) {
      setCardChoice({
        cardName: caught[dex].cardName || '',
        cardUrl: caught[dex].cardUrl || '',
      })
      setSelectedCardId(caught[dex].cardId || '')
    } else {
      setCardChoice({ cardName: '', cardUrl: '' })
      setSelectedCardId('')
    }

    // fetch available TCG cards for this Pokémon (exclude Common/Uncommon/Rare)
    const pokemon = POKEDEX.find((p) => p.dex === dex)
    if (!pokemon) return
    const name = pokemon.name
    setAvailableCards([])
    setCardsError(null)
    setCardsLoading(true)
    fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(`name:"${name}"`)}&pageSize=250`)
      .then((res) => res.json())
      .then((data) => {
        const cards = data?.data || []
        const filtered = cards.filter((c) => {
          const r = (c.rarity || '').toLowerCase()
          if (!r) return true
          if (r.includes('double')) return false
          return !['common', 'uncommon', 'rare'].includes(r)
        })
        setAvailableCards(filtered || [])
      })
      .catch((err) => setCardsError(err?.message || String(err)))
      .finally(() => setCardsLoading(false))
  }

  function completePokemon(event) {
    event.preventDefault()
    const cardName = cardChoice.cardName.trim()
    const cardUrl = cardChoice.cardUrl.trim()
    if (!cardName) return
    // if we have availableCards, require selectedCardId
    if (availableCards.length > 0 && !selectedCardId) return

    const cardData = availableCards.find((c) => c.id === selectedCardId)
    const payload = cardData
      ? {
          cardName: cardData.name,
          cardId: cardData.id,
          cardImage: cardData.images?.small || cardData.images?.large || '',
          rarity: cardData.rarity || '',
        }
      : { cardName, cardUrl }

    setCaught((current) => ({
      ...current,
      [selectedDex]: payload,
    }))
    setSelectedDex(null)
  }

  function unclaimPokemon(dex) {
    setCaught((current) => {
      const next = { ...current }
      delete next[dex]
      return next
    })
    if (selectedDex === dex) setSelectedDex(null)
  }

  function clearSelection() {
    setSelectedDex(null)
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <p className="overline">Pokédex</p>
          <h1>Claim your Pokémon</h1>
          <p className="subhead">
            Search the National Pokédex and mark a Pokémon complete by choosing
            an official Pokémon TCG card.
          </p>
        </div>

        <div className="search-group">
          <input
            className="search-input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or number"
          />
          <div className="summary">{caughtCount} / {POKEDEX.length} complete</div>
        </div>
      </header>

      {selectedPokemon ? (
        <section className="selection-panel">
          <div className="selection-header">
            <div>
              <h2>{selectedPokemonCaught ? 'Update card selection' : `Complete ${selectedPokemon.name}`}</h2>
              <p className="selection-subhead">
                Choose an official Pokémon TCG card from the Pokémon TCG Card
                Database to complete this entry.
              </p>
            </div>
            <button className="secondary-button" type="button" onClick={clearSelection}>
              Cancel
            </button>
          </div>

          <form className="selection-form" onSubmit={completePokemon}>
            <div className="selection-row">
              {cardsLoading ? (
                <div>Loading card list…</div>
              ) : availableCards.length > 0 ? (
                <label>
                  Choose card
                  <select
                    name="selectedCard"
                    value={selectedCardId}
                    onChange={(e) => {
                      const id = e.target.value
                      setSelectedCardId(id)
                      const card = availableCards.find((c) => c.id === id)
                      if (card) {
                        setCardChoice((cur) => ({
                          ...cur,
                          cardName: card.name,
                          cardUrl: card.images?.large || card.images?.small || '',
                        }))
                      }
                    }}
                    required
                  >
                    <option value="">Select a card</option>
                    {Array.isArray(availableCards)
                      ? availableCards.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name} — {card.rarity || 'Unknown'}{card.set ? ` (${card.set.name})` : ''}
                          </option>
                        ))
                      : null}
                  </select>
                </label>
              ) : (
                <>
                  <label>
                    Card name
                    <input
                      name="cardName"
                      value={cardChoice.cardName}
                      onChange={handleChoiceChange}
                      placeholder="Charizard VMAX, Pikachu V, etc."
                      required
                    />
                  </label>

                  <label>
                    Card page URL
                    <input
                      name="cardUrl"
                      value={cardChoice.cardUrl}
                      onChange={handleChoiceChange}
                      placeholder="https://www.pokemontcg.com/..."
                      required
                    />
                  </label>
                </>
              )}
            </div>

            {(selectedCard || caught[selectedDex]) ? (
              <div className="card-preview">
                <img
                  src={
                    (selectedCard && (selectedCard.images?.large || selectedCard.images?.small)) ||
                    caught[selectedDex]?.cardImage ||
                    cardChoice.cardUrl ||
                    ''
                  }
                  alt={selectedCard ? selectedCard.name : cardChoice.cardName}
                />
                <div className="preview-meta">
                  <strong className="preview-title">{selectedCard ? selectedCard.name : cardChoice.cardName}</strong>
                  { (selectedCard?.rarity || caught[selectedDex]?.rarity) ? (
                    <span className="rarity-badge">{selectedCard?.rarity || caught[selectedDex]?.rarity}</span>
                  ) : null }
                </div>
              </div>
            ) : null}

            <div className="action-group">
              <button className="primary-button" type="submit">
                {selectedPokemonCaught ? 'Save selection' : 'Complete Pokémon'}
              </button>
              {selectedPokemonCaught ? (
                <button className="secondary-button" type="button" onClick={() => unclaimPokemon(selectedDex)}>
                  Unclaim
                </button>
              ) : null}
            </div>

            {selectedPokemonCaught ? (
              <p className="selection-note">
                Current card:{' '}
                  <select
                    value={selectionAction}
                    onChange={(e) => {
                      const val = e.target.value
                      setSelectionAction('card')
                      if (val === 'open') {
                        const url = caught[selectedDex]?.cardUrl || caught[selectedDex]?.cardImage
                        if (url) window.open(url, '_blank', 'noopener')
                      }
                      if (val === 'unclaim') {
                        unclaimPokemon(selectedDex)
                      }
                      if (val === 'view') {
                        // show selected card details in the form if possible
                        const cid = caught[selectedDex]?.cardId
                        if (cid) setSelectedCardId(cid)
                      }
                    }}
                  >
                    <option value="card">{caught[selectedDex].cardName}</option>
                    <option value="open">Open card page</option>
                    <option value="view">View in selection</option>
                    <option value="unclaim">Unclaim</option>
                  </select>
              </p>
            ) : null}
          </form>
        </section>
      ) : null}

      <main>
        <div className="pokedex-grid">
          {filteredPokemon.map((pokemon) => {
            const isCaught = !!caught[pokemon.dex]
            return (
              <button
                key={pokemon.dex}
                type="button"
                className={`pokemon-card ${isCaught ? 'caught' : 'uncaught'}`}
                onClick={() => selectPokemon(pokemon.dex)}
              >
                {
                  (() => {
                    const caughtData = caught[pokemon.dex]
                    const thumbSrc = (caughtData && (caughtData.cardImage || caughtData.cardUrl)) || pokemon.image
                    return (
                      <img
                        className="pokemon-thumb"
                        src={thumbSrc}
                        alt={pokemon.name}
                        loading="lazy"
                      />
                    )
                  })()
                }

                <div className="pokemon-card-meta">
                  <span className="dex-number">#{pokemon.dex}</span>
                  <strong>{pokemon.name}</strong>
                </div>

                <div className="pokemon-card-bottom">
                  <span className="status-badge">{isCaught ? 'Caught' : 'Unclaimed'}</span>
                  {isCaught ? (
                    <span className="rarity-label">{caught[pokemon.dex].cardName}</span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
